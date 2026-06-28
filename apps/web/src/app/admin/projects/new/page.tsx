import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

function normalizeRepoInput(value: string) {
  return value
    .trim()
    .replace("https://github.com/", "")
    .replace("http://github.com/", "")
    .replace(/^\/+|\/+$/g, "");
}

function getGithubHeaders() {
  const githubHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return githubHeaders;
}

function extractStackFromPackageJson(packageJson: unknown) {
  if (!packageJson || typeof packageJson !== "object") {
    return [];
  }

  const pkg = packageJson as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const dependencies = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };

  const stack = new Set<string>();

  const checks: Array<[string, string]> = [
    ["next", "Next.js"],
    ["react", "React"],
    ["typescript", "TypeScript"],
    ["tailwindcss", "Tailwind CSS"],
    ["@prisma/client", "Prisma"],
    ["prisma", "Prisma"],
    ["@trpc/server", "tRPC"],
    ["@trpc/client", "tRPC"],
    ["express", "Express"],
    ["fastify", "Fastify"],
    ["zod", "Zod"],
    ["better-auth", "BetterAuth"],
    ["lucide-react", "Lucide React"],
    ["mongoose", "MongoDB"],
    ["mongodb", "MongoDB"],
    ["pg", "PostgreSQL"],
    ["mysql2", "MySQL"],
    ["drizzle-orm", "Drizzle ORM"],
    ["zustand", "Zustand"],
    ["redux", "Redux"],
    ["@tanstack/react-query", "TanStack Query"],
  ];

  for (const [packageName, label] of checks) {
    if (dependencies[packageName]) {
      stack.add(label);
    }
  }

  return Array.from(stack);
}

async function fetchPackageJson(owner: string, repo: string) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      {
        headers: getGithubHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      content?: string;
    };

    if (!data.content) {
      return [];
    }

    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    const packageJson = JSON.parse(decoded) as unknown;

    return extractStackFromPackageJson(packageJson);
  } catch {
    return [];
  }
}

async function fetchGithubProjectMetadata(repoInput: string) {
  const repoFullName = normalizeRepoInput(repoInput);
  const [owner, repo] = repoFullName.split("/");

  if (!owner || !repo) {
    throw new Error("GitHub repository must be in owner/repo format.");
  }

  const repoResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: getGithubHeaders(),
      cache: "no-store",
    },
  );

  if (!repoResponse.ok) {
    throw new Error(`GitHub repository not found: ${repoFullName}`);
  }

  const repoData = (await repoResponse.json()) as {
    full_name?: string;
    name?: string;
    description?: string | null;
    languages_url?: string;
  };

  let languages: string[] = [];

  if (repoData.languages_url) {
    const languagesResponse = await fetch(repoData.languages_url, {
      headers: getGithubHeaders(),
      cache: "no-store",
    });

    if (languagesResponse.ok) {
      const languagesData = (await languagesResponse.json()) as Record<
        string,
        number
      >;

      languages = Object.keys(languagesData ?? {});
    }
  }

  const packageStack = await fetchPackageJson(owner, repo);
  const techStack = Array.from(new Set([...packageStack, ...languages]));

  return {
    repoFullName: String(repoData.full_name ?? repoFullName),
    repoName: String(repoData.name ?? repo),
    description: String(repoData.description ?? ""),
    techStack: techStack.join(", "),
  };
}

export default async function NewProjectPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  async function createProject(formData: FormData) {
    "use server";

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      redirect("/auth/sign-in");
    }

    const membership = await db.membership.findFirst({
      where: {
        userId: session.user.id,
        role: "ADMIN" as any,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!membership) {
      redirect("/auth/redirect");
    }

    const repoInput = String(formData.get("repoFullName") ?? "").trim();

    if (!repoInput) {
      throw new Error("GitHub repository is required.");
    }

    const githubMeta = await fetchGithubProjectMetadata(repoInput);

    const manualName = String(formData.get("name") ?? "").trim();
    const manualDescription = String(formData.get("description") ?? "").trim();
    const manualTechStack = String(formData.get("techStack") ?? "").trim();

    const existingFeatures = String(
      formData.get("existingFeatures") ?? "",
    ).trim();

    const businessGoals = String(formData.get("businessGoals") ?? "").trim();

    const name = manualName || githubMeta.repoName;
    const description = manualDescription || githubMeta.description;
    const techStack = manualTechStack || githubMeta.techStack;

    if (!name) {
      throw new Error("Project name is required.");
    }

    const project = await db.project.create({
      data: {
        workspaceId: membership.workspaceId,
        name,
        description,
        type: "EXISTING",
        techStack,
        existingFeatures,
        businessGoals,
      },
    });

    await db.gitHubRepo.upsert({
      where: {
        projectId: project.id,
      },
      update: {
        repoFullName: githubMeta.repoFullName,
        installationId: "",
      },
      create: {
        projectId: project.id,
        repoFullName: githubMeta.repoFullName,
        installationId: "",
      },
    });

    await db.auditLog
      .create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: session.user.id,
          action: "project.created",
          entityType: "Project",
          entityId: project.id,
          metadata: JSON.stringify({
            name,
            repoFullName: githubMeta.repoFullName,
            description,
            techStack,
          }),
        },
      })
      .catch(() => null);

    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-[#111111] px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <a
          href="/admin"
          className="text-sm text-white/40 transition hover:text-white"
        >
          ← Projects
        </a>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          New project
        </h1>

        <p className="mt-6 text-sm text-white/45">
          Enter a GitHub repository. Loom will fetch the repository
          description and tech stack automatically when the project is created.
        </p>

        <form action={createProject} className="mt-35">
          <section className="rounded-2xl border border-white/10 bg-[#171717] p-6 md:p-8">
            <div className="space-y-6">
              <Field
                label="GitHub repository"
                name="repoFullName"
                placeholder="owner/repo"
                required
              />

            
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <a
                href="/admin"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/60 transition hover:border-[#aa4825]/50 hover:text-white"
              >
                Cancel
              </a>

              <button
                type="submit"
                className="rounded-xl bg-[#aa4825] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
              >
                Create project
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-white/75">
        {label}
      </label>

      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  placeholder,
  rows,
}: {
  label: string;
  name: string;
  placeholder: string;
  rows: number;
}) {
  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-white/75">
        {label}
      </label>

      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
      />
    </div>
  );
}
