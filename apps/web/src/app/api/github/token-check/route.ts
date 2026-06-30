import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePullRequestUrl(input: string) {
  const value = input.trim();

  const match = value.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i,
  );

  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
    pullNumber: Number(match[3]),
  };
}

function tokenFingerprint(token: string) {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

export async function GET(req: NextRequest) {
  try {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "GITHUB_TOKEN is missing from the running Next.js server.",
        },
        { status: 500 },
      );
    }

    const searchParams = req.nextUrl.searchParams;

    const prUrl =
      searchParams.get("prUrl") ||
      "https://github.com/Vaishnaviii002/SkillHire/pull/1";

    const parsedPr = parsePullRequestUrl(prUrl);

    if (!parsedPr) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid prUrl. Use a full GitHub PR URL.",
          example:
            "/api/github/token-check?prUrl=https://github.com/Vaishnaviii002/SkillHire/pull/1",
        },
        { status: 400 },
      );
    }

    const octokit = new Octokit({
      auth: token,
    });

    const authenticatedUser = await octokit.rest.users.getAuthenticated();

    const repository = await octokit.rest.repos.get({
      owner: parsedPr.owner,
      repo: parsedPr.repo,
    });

    const pull = await octokit.rest.pulls.get({
      owner: parsedPr.owner,
      repo: parsedPr.repo,
      pull_number: parsedPr.pullNumber,
    });

    return NextResponse.json({
      ok: true,
      tokenLoaded: true,
      tokenFingerprint: tokenFingerprint(token),
      tokenPrefix: token.slice(0, 10),
      authenticatedAs: {
        login: authenticatedUser.data.login,
        id: authenticatedUser.data.id,
      },
      repository: {
        fullName: repository.data.full_name,
        private: repository.data.private,
        permissions: repository.data.permissions,
      },
      pullRequest: {
        url: pull.data.html_url,
        number: pull.data.number,
        title: pull.data.title,
        state: pull.data.state,
        merged: pull.data.merged,
        mergeable: pull.data.mergeable,
        baseRepo: pull.data.base.repo.full_name,
        baseBranch: pull.data.base.ref,
        headRepo: pull.data.head.repo?.full_name || "",
        headBranch: pull.data.head.ref,
      },
      requiredForMerge: {
        fineGrainedToken: [
          "Repository access must include the base repo shown above.",
          "Contents permission must be Read and write.",
          "Pull requests permission should be Read and write.",
        ],
        classicToken: ["repo scope"],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        tokenLoaded: Boolean(process.env.GITHUB_TOKEN),
        error: error?.message || "GitHub token check failed",
        githubStatus: error?.status || null,
        githubDocumentationUrl: error?.documentation_url || null,
        acceptedGitHubPermissions:
          error?.response?.headers?.["x-accepted-github-permissions"] || null,
      },
      { status: 500 },
    );
  }
}