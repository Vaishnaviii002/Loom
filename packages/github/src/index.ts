import { Octokit } from "octokit";

export type GitHubPullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  blobUrl: string | null;
  rawUrl: string | null;
  previousFilename: string | null;
};

export type GitHubRepositoryResult = {
  repoFullName: string;
  owner: string;
  name: string;
  defaultBranch: string;
  url: string;
};

export type GitHubPullRequestResult = {
  repoFullName: string;
  prNumber: number;
  title: string;
  state: string;
  url: string;
  branch: string;
  baseBranch: string;
  author: string | null;
  changedFiles: number;
  additions: number;
  deletions: number;
};

export type GitHubPullRequestDiffResult = GitHubPullRequestResult & {
  files: GitHubPullRequestFile[];
  rawDiff: string;
  diffSummary: string;
};

function getOctokit() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN is missing in environment variables.");
  }

  return new Octokit({
    auth: token,
  });
}

export function normalizeRepoFullName(input: string) {
  return input
    .trim()
    .replace("https://github.com/", "")
    .replace("http://github.com/", "")
    .replace(/^\/+|\/+$/g, "");
}

export async function fetchRepository(
  repoInput: string,
): Promise<GitHubRepositoryResult> {
  const repoFullName = normalizeRepoFullName(repoInput);
  const [owner, name] = repoFullName.split("/");

  if (!owner || !name) {
    throw new Error("Repository must be in owner/repo format.");
  }

  const octokit = getOctokit();

  const response = await octokit.rest.repos.get({
    owner,
    repo: name,
  });

  return {
    repoFullName: response.data.full_name,
    owner: response.data.owner.login,
    name: response.data.name,
    defaultBranch: response.data.default_branch,
    url: response.data.html_url,
  };
}

export function parsePullRequestUrl(url: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid GitHub pull request URL.");
  }

  if (parsedUrl.hostname !== "github.com") {
    throw new Error("Pull request URL must be from github.com.");
  }

  const parts = parsedUrl.pathname.split("/").filter(Boolean);

  const owner = parts[0];
  const repo = parts[1];
  const pullKeyword = parts[2];
  const prNumber = Number(parts[3]);

  if (!owner || !repo || pullKeyword !== "pull" || !Number.isInteger(prNumber)) {
    throw new Error("Invalid GitHub pull request URL.");
  }

  return {
    owner,
    repo,
    repoFullName: `${owner}/${repo}`,
    prNumber,
  };
}

export async function fetchPullRequestFromUrl(
  url: string,
): Promise<GitHubPullRequestResult> {
  const parsed = parsePullRequestUrl(url);
  const octokit = getOctokit();

  const response = await octokit.rest.pulls.get({
    owner: parsed.owner,
    repo: parsed.repo,
    pull_number: parsed.prNumber,
  });

  return {
    repoFullName: parsed.repoFullName,
    prNumber: response.data.number,
    title: response.data.title,
    state: response.data.state,
    url: response.data.html_url,
    branch: response.data.head.ref,
    baseBranch: response.data.base.ref,
    author: response.data.user?.login ?? null,
    changedFiles: response.data.changed_files ?? 0,
    additions: response.data.additions ?? 0,
    deletions: response.data.deletions ?? 0,
  };
}

export async function fetchPullRequestDiff(
  url: string,
): Promise<GitHubPullRequestDiffResult> {
  const parsed = parsePullRequestUrl(url);
  const octokit = getOctokit();

  const pullResponse = await octokit.rest.pulls.get({
    owner: parsed.owner,
    repo: parsed.repo,
    pull_number: parsed.prNumber,
  });

  const filesResponse = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner: parsed.owner,
    repo: parsed.repo,
    pull_number: parsed.prNumber,
    per_page: 100,
  });

  const files: GitHubPullRequestFile[] = filesResponse.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch ?? null,
    blobUrl: file.blob_url ?? null,
    rawUrl: file.raw_url ?? null,
    previousFilename: file.previous_filename ?? null,
  }));

  const rawDiff = files
    .map((file) => {
      const patch = file.patch ?? "No patch available for this file.";

      return [
        `diff --git ${file.filename}`,
        `status: ${file.status}`,
        `additions: ${file.additions}`,
        `deletions: ${file.deletions}`,
        patch,
      ].join("\n");
    })
    .join("\n\n");

  const diffSummary = [
    `Pull request #${pullResponse.data.number}: ${pullResponse.data.title}`,
    `Repository: ${parsed.repoFullName}`,
    `Branch: ${pullResponse.data.head.ref} → ${pullResponse.data.base.ref}`,
    `Files changed: ${pullResponse.data.changed_files ?? files.length}`,
    `Additions: ${pullResponse.data.additions ?? 0}`,
    `Deletions: ${pullResponse.data.deletions ?? 0}`,
  ].join("\n");

  return {
    repoFullName: parsed.repoFullName,
    prNumber: pullResponse.data.number,
    title: pullResponse.data.title,
    state: pullResponse.data.state,
    url: pullResponse.data.html_url,
    branch: pullResponse.data.head.ref,
    baseBranch: pullResponse.data.base.ref,
    author: pullResponse.data.user?.login ?? null,
    changedFiles: pullResponse.data.changed_files ?? files.length,
    additions: pullResponse.data.additions ?? 0,
    deletions: pullResponse.data.deletions ?? 0,
    files,
    rawDiff,
    diffSummary,
  };
}