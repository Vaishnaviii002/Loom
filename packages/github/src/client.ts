import { Octokit } from "octokit";

export function getGitHubClient() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN is missing in environment variables.");
  }

  return new Octokit({
    auth: token,
  });
}