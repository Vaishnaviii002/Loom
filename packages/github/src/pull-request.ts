import { getGitHubClient } from "./client";

export type ParsedPullRequestUrl = {
  owner: string;
  repo: string;
  repoFullName: string;
  prNumber: number;
};

export type GitHubPullRequestResult = {
  repoFullName: string;
  prNumber: number;
  title: string;
  state: string;
  url: string;
  branch?: string;
  baseBranch?: string;
  author?: string;
  changedFiles: number;
  additions: number;
  deletions: number;
};

export function parsePullRequestUrl(
  pullRequestUrl: string,
): ParsedPullRequestUrl {
  const url = new URL(pullRequestUrl);

  if (!url.hostname.includes("github.com")) {
    throw new Error("Only GitHub pull request URLs are supported.");
  }

  const parts = url.pathname.split("/").filter(Boolean);

  const owner = parts[0];
  const repo = parts[1];
  const pullKeyword = parts[2];
  const prNumberRaw = parts[3];

  if (!owner || !repo || pullKeyword !== "pull" || !prNumberRaw) {
    throw new Error(
      "Invalid GitHub PR URL. Expected: https://github.com/owner/repo/pull/123",
    );
  }

  const prNumber = Number(prNumberRaw);

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error("Invalid GitHub pull request number.");
  }

  return {
    owner,
    repo,
    repoFullName: `${owner}/${repo}`,
    prNumber,
  };
}

export async function fetchPullRequestFromUrl(
  pullRequestUrl: string,
): Promise<GitHubPullRequestResult> {
  const octokit = getGitHubClient();
  const parsed = parsePullRequestUrl(pullRequestUrl);

  const response = await octokit.rest.pulls.get({
    owner: parsed.owner,
    repo: parsed.repo,
    pull_number: parsed.prNumber,
  });

  const pull = response.data;

  return {
    repoFullName: parsed.repoFullName,
    prNumber: pull.number,
    title: pull.title,
    state: pull.state,
    url: pull.html_url,
    branch: pull.head?.ref ?? undefined,
    baseBranch: pull.base?.ref ?? undefined,
    author: pull.user?.login ?? undefined,
    changedFiles: pull.changed_files ?? 0,
    additions: pull.additions ?? 0,
    deletions: pull.deletions ?? 0,
  };
}