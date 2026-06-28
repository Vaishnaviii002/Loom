import { getGitHubClient } from "./client";
import { normalizeRepoFullName } from "./repository";

export type GitHubPullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  rawUrl?: string;
  blobUrl?: string;
};

export type GitHubPullRequestDiffResult = {
  repoFullName: string;
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  state: string;
  author: string | null;
  baseBranch: string | null;
  headBranch: string | null;
  changedFiles: number;
  additions: number;
  deletions: number;
  htmlUrl: string;
  files: GitHubPullRequestFile[];
  combinedPatch: string;
};

function buildCombinedPatch(files: GitHubPullRequestFile[]) {
  if (files.length === 0) {
    return "No changed files were returned by GitHub.";
  }

  return files
    .map((file) => {
      const header = [
        `FILE: ${file.filename}`,
        `STATUS: ${file.status}`,
        `ADDITIONS: ${file.additions}`,
        `DELETIONS: ${file.deletions}`,
        `CHANGES: ${file.changes}`,
      ].join("\n");

      const patch = file.patch?.trim()
        ? file.patch
        : "[No patch available for this file. It may be binary, too large, or generated.]";

      return `${header}\n\n${patch}`;
    })
    .join("\n\n---\n\n");
}

export async function fetchPullRequestDiff(input: {
  repoFullName: string;
  prNumber: number;
}): Promise<GitHubPullRequestDiffResult> {
  const octokit = getGitHubClient();
  const { owner, repo, repoFullName } = normalizeRepoFullName(input.repoFullName);

  const pullResponse = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: input.prNumber,
  });

  const pull = pullResponse.data;

  const files: GitHubPullRequestFile[] = [];
  let page = 1;

  while (true) {
    const filesResponse = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: input.prNumber,
      per_page: 100,
      page,
    });

    const pageFiles: GitHubPullRequestFile[] = filesResponse.data.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions ?? 0,
      deletions: file.deletions ?? 0,
      changes: file.changes ?? 0,
      patch: file.patch ?? "",
      rawUrl: file.raw_url,
      blobUrl: file.blob_url,
    }));

    files.push(...pageFiles);

    if (filesResponse.data.length < 100) {
      break;
    }

    page += 1;
  }

  return {
    repoFullName,
    owner,
    repo,
    prNumber: pull.number,
    title: pull.title,
    state: pull.state,
    author: pull.user?.login ?? null,
    baseBranch: pull.base?.ref ?? null,
    headBranch: pull.head?.ref ?? null,
    changedFiles: pull.changed_files ?? files.length,
    additions:
      pull.additions ?? files.reduce((total, file) => total + file.additions, 0),
    deletions:
      pull.deletions ?? files.reduce((total, file) => total + file.deletions, 0),
    htmlUrl: pull.html_url,
    files,
    combinedPatch: buildCombinedPatch(files),
  };
}