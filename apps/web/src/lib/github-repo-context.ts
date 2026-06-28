type RepoFile = {
  path: string;
  content: string;
};

type GitHubTreeItem = {
  path?: string;
  type?: string;
  size?: number;
};

type GitHubTreeResponse = {
  tree?: GitHubTreeItem[];
};

type GitHubRepoResponse = {
  default_branch?: string;
  description?: string | null;
  language?: string | null;
  html_url?: string;
};

type GitHubBlobResponse = {
  content?: string;
  encoding?: string;
};

export type RepoContextResult = {
  repoFullName: string;
  description: string;
  defaultBranch: string;
  primaryLanguage: string;
  repoUrl: string;
  techStack: string;
  relevantFiles: RepoFile[];
  repoSummary: string;
};

function getGithubHeaders() {
  const githubHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return githubHeaders;
}

function normalizeRepoFullName(repoFullName: string) {
  return repoFullName
    .trim()
    .replace("https://github.com/", "")
    .replace("http://github.com/", "")
    .replace(/^\/+|\/+$/g, "");
}

function parseRepoFullName(repoFullName: string) {
  const clean = normalizeRepoFullName(repoFullName);
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

async function fetchGithubJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: getGithubHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function safeDecodeBase64(value: string) {
  try {
    return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n\n/* truncated */`;
}

function isUsefulSourceFile(path: string) {
  const lower = path.toLowerCase();

  if (
    lower.includes("node_modules/") ||
    lower.includes(".next/") ||
    lower.includes("dist/") ||
    lower.includes("build/") ||
    lower.includes(".turbo/") ||
    lower.includes("package-lock.json") ||
    lower.includes("pnpm-lock.yaml") ||
    lower.includes("yarn.lock")
  ) {
    return false;
  }

  return [
    ".tsx",
    ".ts",
    ".jsx",
    ".js",
    ".css",
    ".scss",
    ".json",
    ".md",
    ".html",
    ".prisma",
  ].some((extension) => lower.endsWith(extension));
}

function getRequestKeywords(message: string) {
  const lower = message.toLowerCase();

  const keywordMap: Array<[string[], string[]]> = [
    [["landing", "home", "hero"], ["page.tsx", "app/page", "landing", "home"]],
    [["logo", "brand", "branding"], ["logo", "brand", "public", "components/brand"]],
    [["background", "color", "theme"], ["globals.css", "tailwind", "theme", "layout"]],
    [["dashboard", "admin"], ["dashboard", "admin"]],
    [["client"], ["client", "portal"]],
    [["request", "ticket"], ["request", "ticket", "feature"]],
    [["auth", "login", "sign in", "signup", "sign up"], ["auth", "sign-in", "sign-up"]],
    [["sidebar", "navigation", "nav"], ["sidebar", "nav", "layout"]],
    [["button", "cta"], ["button", "cta"]],
    [["pricing", "billing"], ["pricing", "billing"]],
  ];

  const keywords = new Set<string>();

  for (const [triggers, related] of keywordMap) {
    if (triggers.some((trigger) => lower.includes(trigger))) {
      related.forEach((item) => keywords.add(item));
    }
  }

  lower
    .split(/[^a-z0-9-_./]+/i)
    .filter((word) => word.length >= 4)
    .slice(0, 30)
    .forEach((word) => keywords.add(word));

  return Array.from(keywords);
}

function scoreFile(path: string, message: string) {
  const lowerPath = path.toLowerCase();
  const lowerMessage = message.toLowerCase();
  const keywords = getRequestKeywords(message);

  let score = 0;

  for (const keyword of keywords) {
    if (lowerPath.includes(keyword.toLowerCase())) {
      score += 8;
    }
  }

  const importantPaths = [
    "README.md",
    "package.json",
    "app/page.tsx",
    "src/app/page.tsx",
    "app/layout.tsx",
    "src/app/layout.tsx",
    "app/globals.css",
    "src/app/globals.css",
    "tailwind.config",
    "components",
    "src/components",
    "public",
  ];

  for (const importantPath of importantPaths) {
    if (lowerPath.includes(importantPath.toLowerCase())) {
      score += 4;
    }
  }

  if (lowerMessage.includes("landing") && lowerPath.includes("page.tsx")) {
    score += 15;
  }

  if (lowerMessage.includes("logo") && lowerPath.includes("logo")) {
    score += 20;
  }

  if (lowerMessage.includes("background") && lowerPath.includes("css")) {
    score += 15;
  }

  if (lowerMessage.includes("color") && lowerPath.includes("css")) {
    score += 12;
  }

  if (lowerPath.endsWith("package.json")) {
    score += 10;
  }

  if (lowerPath.toLowerCase().endsWith("readme.md")) {
    score += 8;
  }

  return score;
}

function extractStackFromPackageJson(packageJsonText: string) {
  try {
    const packageJson = JSON.parse(packageJsonText) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const dependencies = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
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
      ["ai", "AI SDK"],
      ["inngest", "Inngest"],
      ["@octokit/rest", "Octokit"],
      ["octokit", "Octokit"],
      ["pg", "PostgreSQL"],
      ["mongodb", "MongoDB"],
      ["mongoose", "MongoDB"],
      ["drizzle-orm", "Drizzle ORM"],
      ["zustand", "Zustand"],
      ["@tanstack/react-query", "TanStack Query"],
    ];

    for (const [packageName, label] of checks) {
      if (dependencies[packageName]) {
        stack.add(label);
      }
    }

    return Array.from(stack);
  } catch {
    return [];
  }
}

async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string,
) {
  const encodedPath = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const data = await fetchGithubJson<GitHubBlobResponse>(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(
      branch,
    )}`,
  );

  if (!data?.content) {
    return "";
  }

  return safeDecodeBase64(data.content);
}

export async function getRepositoryContextForRequest({
  repoFullName,
  message,
}: {
  repoFullName: string;
  message: string;
}): Promise<RepoContextResult | null> {
  const parsed = parseRepoFullName(repoFullName);

  if (!parsed) {
    return null;
  }

  const { owner, repo } = parsed;

  const repoData = await fetchGithubJson<GitHubRepoResponse>(
    `https://api.github.com/repos/${owner}/${repo}`,
  );

  if (!repoData) {
    return null;
  }

  const defaultBranch = repoData.default_branch || "main";

  const treeData = await fetchGithubJson<GitHubTreeResponse>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
      defaultBranch,
    )}?recursive=1`,
  );

  const tree = treeData?.tree ?? [];

  const sourceFiles = tree
    .filter((item) => item.type === "blob" && item.path)
    .map((item) => item.path as string)
    .filter(isUsefulSourceFile)
    .map((path) => ({
      path,
      score: scoreFile(path, message),
    }))
    .sort((a, b) => b.score - a.score);

  const alwaysInclude = sourceFiles.filter((file) =>
    [
      "package.json",
      "readme.md",
      "src/app/page.tsx",
      "app/page.tsx",
      "src/app/globals.css",
      "app/globals.css",
      "src/app/layout.tsx",
      "app/layout.tsx",
    ].some((important) => file.path.toLowerCase().endsWith(important)),
  );

  const selectedPaths = Array.from(
    new Set([
      ...alwaysInclude.map((file) => file.path),
      ...sourceFiles.slice(0, 10).map((file) => file.path),
    ]),
  ).slice(0, 14);

  const relevantFiles: RepoFile[] = [];

  for (const path of selectedPaths) {
    const content = await fetchFileContent(owner, repo, defaultBranch, path);

    if (content.trim()) {
      relevantFiles.push({
        path,
        content: truncate(content, 6000),
      });
    }
  }

  const packageFile = relevantFiles.find((file) =>
    file.path.toLowerCase().endsWith("package.json"),
  );

  const packageStack = packageFile
    ? extractStackFromPackageJson(packageFile.content)
    : [];

  const languagesData = await fetchGithubJson<Record<string, number>>(
    `https://api.github.com/repos/${owner}/${repo}/languages`,
  );

  const languages = Object.keys(languagesData ?? {});
  const techStack = Array.from(new Set([...packageStack, ...languages])).join(
    ", ",
  );

  const readmeFile = relevantFiles.find((file) =>
    file.path.toLowerCase().endsWith("readme.md"),
  );

  const repoSummary =
    readmeFile?.content.slice(0, 1800) ||
    repoData.description ||
    "No README or GitHub description found.";

  return {
    repoFullName: `${owner}/${repo}`,
    description: String(repoData.description ?? ""),
    defaultBranch,
    primaryLanguage: String(repoData.language ?? ""),
    repoUrl: String(repoData.html_url ?? `https://github.com/${owner}/${repo}`),
    techStack,
    relevantFiles,
    repoSummary,
  };
}