import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeRepoInput(value: string) {
  return value
    .trim()
    .replace("https://github.com/", "")
    .replace("http://github.com/", "")
    .replace(/^\/+|\/+$/g, "");
}

function getGithubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

function extractStackFromPackageJson(packageJson: any) {
  const dependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
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
    ["lucide-react", "Lucide React"],
    ["better-auth", "BetterAuth"],
    ["next-auth", "NextAuth"],
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

    const data = await response.json();

    if (!data?.content) {
      return [];
    }

    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    const packageJson = JSON.parse(decoded);

    return extractStackFromPackageJson(packageJson);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const repoInput = request.nextUrl.searchParams.get("repo") ?? "";
    const repoFullName = normalizeRepoInput(repoInput);
    const [owner, repo] = repoFullName.split("/");

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Repository must be in owner/repo format." },
        { status: 400 },
      );
    }

    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: getGithubHeaders(),
        cache: "no-store",
      },
    );

    if (!repoResponse.ok) {
      return NextResponse.json(
        { error: `GitHub repository not found: ${repoFullName}` },
        { status: 404 },
      );
    }

    const repoData = await repoResponse.json();

    const languagesResponse = await fetch(repoData.languages_url, {
      headers: getGithubHeaders(),
      cache: "no-store",
    });

    const languagesData = languagesResponse.ok
      ? await languagesResponse.json()
      : {};

    const languages = Object.keys(languagesData ?? {});
    const packageStack = await fetchPackageJson(owner, repo);

    const techStack = Array.from(new Set([...packageStack, ...languages]));

    return NextResponse.json({
      repoFullName: String(repoData.full_name ?? repoFullName),
      repoName: String(repoData.name ?? repo),
      description: String(repoData.description ?? ""),
      techStack: techStack.join(", "),
      defaultBranch: String(repoData.default_branch ?? "main"),
      url: String(repoData.html_url ?? `https://github.com/${repoFullName}`),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch repository.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}