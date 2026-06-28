import { getGitHubClient } from "./client";

export type GitHubRepositoryResult = {
  repoFullName: string;
  owner: string;
  name: string;
  defaultBranch?: string;
};

export function normalizeRepoFullName(input: string) {
  const cleaned = input
    .trim()
    .replace("https://github.com/", "")
    .replace("http://github.com/", "")
    .replace(/^\/+|\/+$/g, "");

  const [owner, repo] = cleaned.split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${input}. Use owner/repo.`);
  }

  return {
    owner,
    repo,
    repoFullName: `${owner}/${repo}`,
  };
}

export async function fetchRepository(
  repoFullNameInput: string,
): Promise<GitHubRepositoryResult> {
  const octokit = getGitHubClient();
  const { owner, repo, repoFullName } = normalizeRepoFullName(repoFullNameInput);

  const response = await octokit.rest.repos.get({
    owner,
    repo,
  });

  return {
    repoFullName,
    owner,
    name: repo,
    defaultBranch: response.data.default_branch ?? undefined,
  };
}