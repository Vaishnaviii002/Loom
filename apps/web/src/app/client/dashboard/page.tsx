import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ClientDashboard from "./client-dashboard";

export const runtime = "nodejs";

type ClientDashboardPageProps = {
  searchParams: Promise<{
    projectId?: string;
    preview?: string;
  }>;
};

type GitHubRepoContext = {
  description: string;
  defaultBranch: string;
  primaryLanguage: string;
  techStack: string;
  url: string;
};

function parseRepoFullName(repoFullName: string) {
  const clean = repoFullName
    .trim()
    .replace("https://github.com/", "")
    .replace("http://github.com/", "")
    .replace(/^\/+|\/+$/g, "");

  const [owner, repo] = clean.split("/");

  if (!owner || !repo) {
    return null;
  }

  return {
    owner,
    repo,
    repoFullName: `${owner}/${repo}`,
  };
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
    ["better-auth", "BetterAuth"],
    ["zod", "Zod"],
    ["lucide-react", "Lucide React"],
    ["@ai-sdk/openai", "AI SDK"],
    ["ai", "AI SDK"],
    ["inngest", "Inngest"],
    ["octokit", "Octokit"],
    ["@octokit/rest", "Octokit"],
    ["pg", "PostgreSQL"],
    ["mongodb", "MongoDB"],
    ["mongoose", "MongoDB"],
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

async function fetchPackageJsonStack(owner: string, repo: string) {
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

async function fetchRepoContext(
  repoFullName: string,
): Promise<GitHubRepoContext | null> {
  const parsed = parseRepoFullName(repoFullName);

  if (!parsed) {
    return null;
  }

  const { owner, repo } = parsed;

  try {
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: getGithubHeaders(),
        cache: "no-store",
      },
    );

    if (!repoResponse.ok) {
      return null;
    }

    const repoData = (await repoResponse.json()) as {
      description?: string | null;
      default_branch?: string;
      language?: string | null;
      html_url?: string;
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

    const packageStack = await fetchPackageJsonStack(owner, repo);

    const techStack = Array.from(
      new Set([...packageStack, ...languages].filter(Boolean)),
    );

    return {
      description: String(repoData.description ?? ""),
      defaultBranch: String(repoData.default_branch ?? ""),
      primaryLanguage: String(repoData.language ?? ""),
      techStack: techStack.join(", "),
      url: String(repoData.html_url ?? `https://github.com/${owner}/${repo}`),
    };
  } catch {
    return null;
  }
}

function mapRequest(request: any) {
  return {
    id: request.id,
    title: request.title,
    type: String(request.type ?? ""),
    status: String(request.status ?? ""),
    priority: String(request.priority ?? "MEDIUM"),
    rawDescription: request.rawDescription ?? "",
    createdAt: request.createdAt?.toISOString?.() ?? "",
  };
}

export default async function ClientDashboardPage({
  searchParams,
}: ClientDashboardPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const resolvedSearchParams = await searchParams;
  const selectedProjectId = String(resolvedSearchParams.projectId ?? "").trim();
  const isAdminPreview = resolvedSearchParams.preview === "admin";

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/auth/redirect");
  }

  const isAdmin = membership.role === "ADMIN";
  const isClient = membership.role === "CLIENT";

  if (!isAdmin && !isClient) {
    redirect("/auth/redirect");
  }

  if (isAdminPreview && !isAdmin) {
    redirect("/auth/redirect");
  }

  if (isAdminPreview && isAdmin) {
    if (!selectedProjectId) {
      redirect("/admin");
    }

    const project = await db.project.findFirst({
      where: {
        id: selectedProjectId,
        workspaceId: membership.workspaceId,
      },
      include: {
        gitHubRepo: true,
        featureRequests: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!project) {
      notFound();
    }

    const projectClientAccess = await db.clientProjectAccess.findFirst({
      where: {
        projectId: project.id,
      },
    });

    const previewClient = projectClientAccess?.clientId
      ? await db.user.findUnique({
          where: {
            id: projectClientAccess.clientId,
          },
        })
      : null;

    const repoFullName = project.gitHubRepo?.repoFullName ?? "";
    const repoContext = repoFullName ? await fetchRepoContext(repoFullName) : null;

    return (
      <ClientDashboard
        mode="ADMIN_PREVIEW"
        client={{
          id: previewClient?.id ?? session.user.id,
          name: previewClient?.name ?? "Client",
          email: previewClient?.email ?? "No client joined yet",
        }}
        assignedProjects={[
          {
            id: project.id,
            name: project.name,
            repoFullName,
          },
        ]}
        project={{
          id: project.id,
          name: project.name,
          description:
            repoContext?.description || project.description || "",
          techStack:
            repoContext?.techStack ||
            repoContext?.primaryLanguage ||
            project.techStack ||
            "",
          repoFullName,
          repoDescription:
            repoContext?.description || project.description || "",
          repoLanguage:
            repoContext?.primaryLanguage || project.techStack || "",
          repoDefaultBranch: repoContext?.defaultBranch || "",
          repoUrl: repoContext?.url || "",
        }}
        requests={project.featureRequests.map(mapRequest)}
      />
    );
  }

  if (!isClient) {
    redirect("/auth/redirect");
  }

  const projectAccesses = await db.clientProjectAccess.findMany({
    where: {
      clientId: session.user.id,
    },
    include: {
      project: {
        include: {
          gitHubRepo: true,
          featureRequests: {
            where: {
              clientId: session.user.id,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (projectAccesses.length === 0) {
    return (
      <main className="h-screen overflow-hidden bg-[#111111] text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
          Loom Client Portal
        </p>

        <h1 className="mt-3 text-4xl font-semibold">No assigned project</h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
          Your account is active, but no project access has been assigned yet.
          Ask the admin to send you a project invite.
        </p>
      </main>
    );
  }

  const selectedAccess = selectedProjectId
    ? projectAccesses.find((access) => access.projectId === selectedProjectId)
    : projectAccesses[0];

  if (!selectedAccess) {
    notFound();
  }

  if (!selectedProjectId) {
    redirect(`/client/dashboard?projectId=${selectedAccess.projectId}`);
  }

  const project = selectedAccess.project;
  const repoFullName = project.gitHubRepo?.repoFullName ?? "";
  const repoContext = repoFullName ? await fetchRepoContext(repoFullName) : null;

  return (
    <ClientDashboard
      mode="CLIENT"
      client={{
        id: session.user.id,
        name: session.user.name ?? "Client",
        email: session.user.email ?? "",
      }}
      assignedProjects={[
        {
          id: project.id,
          name: project.name,
          repoFullName,
        },
      ]}
      project={{
        id: project.id,
        name: project.name,
        description:
          repoContext?.description || project.description || "",
        techStack:
          repoContext?.techStack ||
          repoContext?.primaryLanguage ||
          project.techStack ||
          "",
        repoFullName,
        repoDescription:
          repoContext?.description || project.description || "",
        repoLanguage:
          repoContext?.primaryLanguage || project.techStack || "",
        repoDefaultBranch: repoContext?.defaultBranch || "",
        repoUrl: repoContext?.url || "",
      }}
      requests={project.featureRequests.map(mapRequest)}
    />
  );
}