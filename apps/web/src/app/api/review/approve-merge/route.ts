import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Octokit } from "@octokit/rest";
import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SeniorSummaryMetadata = {
  projectId?: string;
  requestId?: string;
  prdId?: string;
  taskId?: string;
  taskTitle?: string;
  ownerRole?: string;
  repository?: string;
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  pullNumber?: number | null;
  status?: string;
  summary?: {
    pullRequestSummary?: {
      pullRequestUrl?: string;
      pullRequestTitle?: string;
      pullNumber?: number | null;
      repository?: string;
    };
    aiDecision?: string;
  };
};

const SENIOR_ROLES = [
  "SENIOR_ENG",
  "SENIOR_ENGINEER",
  "SENIOR_DEVELOPER",
  "REVIEWER",
  "HUMAN_REVIEWER",
];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function safeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parseMetadata<T>(metadata: unknown): T | null {
  try {
    if (!metadata) return null;

    const parsed =
      typeof metadata === "string"
        ? JSON.parse(metadata)
        : JSON.parse(JSON.stringify(metadata));

    if (!parsed || typeof parsed !== "object") return null;

    return parsed as T;
  } catch {
    return null;
  }
}

function isSeniorRole(role: unknown) {
  return SENIOR_ROLES.includes(String(role));
}

function parsePullRequestUrl(input: string) {
  const value = input.trim();

  const fullUrlMatch = value.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i,
  );

  if (fullUrlMatch) {
    return {
      owner: fullUrlMatch[1],
      repo: fullUrlMatch[2],
      pullNumber: Number(fullUrlMatch[3]),
    };
  }

  const shortMatch = value.match(/^([^/]+)\/([^#]+)#(\d+)$/);

  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      pullNumber: Number(shortMatch[3]),
    };
  }

  return null;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/review/approve-merge",
    message: "Approve merge API route is working. Use POST to merge a PR.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id || !session.user.email) {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const summaryId = safeString(body.summaryId);
    const mergeMethod = safeString(body.mergeMethod) || "squash";

    if (!summaryId) return jsonError("summaryId is required");

    if (!["merge", "squash", "rebase"].includes(mergeMethod)) {
      return jsonError("Invalid merge method. Use merge, squash, or rebase.");
    }

    if (!process.env.GITHUB_TOKEN) {
      return jsonError("GITHUB_TOKEN is missing in environment variables", 500);
    }

    const summaryLog = await db.auditLog.findUnique({
      where: { id: summaryId },
    });

    if (!summaryLog) {
      return jsonError("Senior review summary not found", 404);
    }

    if (summaryLog.action !== "developer.pr.sent_to_senior") {
      return jsonError("This summary is not ready for senior approval");
    }

    const metadata = parseMetadata<SeniorSummaryMetadata>(summaryLog.metadata);

    if (!metadata) {
      return jsonError("Invalid senior summary metadata");
    }

    const membership = await db.membership.findFirst({
      where: {
        workspaceId: summaryLog.workspaceId,
        userId: session.user.id,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (String(membership?.role) === "ADMIN") {
      return jsonError("Admin preview is read-only and cannot merge PRs", 403);
    }

    let hasSeniorAccess = Boolean(membership && isSeniorRole(membership.role));

    if (!hasSeniorAccess) {
      const acceptedInvite = await db.invite.findFirst({
        where: {
          email: session.user.email,
          status: "ACCEPTED" as any,
          ...(metadata.projectId ? { projectId: metadata.projectId } : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          role: true,
        },
      });

      hasSeniorAccess = Boolean(
        acceptedInvite && isSeniorRole(acceptedInvite.role),
      );
    }

    if (!hasSeniorAccess) {
      return jsonError("You do not have senior engineer access", 403);
    }

    const pullRequestUrl =
      safeString(metadata.pullRequestUrl) ||
      safeString(metadata.summary?.pullRequestSummary?.pullRequestUrl);

    if (!pullRequestUrl) {
      return jsonError("No pull request URL found in the senior summary");
    }

    const parsedPr = parsePullRequestUrl(pullRequestUrl);

    if (!parsedPr) {
      return jsonError("Invalid GitHub pull request URL");
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const pull = await octokit.rest.pulls.get({
      owner: parsedPr.owner,
      repo: parsedPr.repo,
      pull_number: parsedPr.pullNumber,
    });

    if (pull.data.base.ref !== "main") {
      return jsonError(
        `This PR targets "${pull.data.base.ref}". Senior approval can only merge PRs targeting main branch.`,
      );
    }

    if (pull.data.state !== "open" && !pull.data.merged) {
      return jsonError(`This PR is "${pull.data.state}" and cannot be merged.`);
    }

    if (pull.data.merged) {
      const auditLog = await db.auditLog.create({
        data: {
          workspaceId: summaryLog.workspaceId,
          actorId: session.user.id,
          action: "senior.pr.approved_and_merged",
          entityType: "PullRequest",
          entityId: pullRequestUrl,
          metadata: JSON.stringify({
            summaryId,
            projectId: metadata.projectId || "",
            requestId: metadata.requestId || "",
            prdId: metadata.prdId || "",
            taskId: metadata.taskId || "",
            taskTitle: metadata.taskTitle || pull.data.title,
            repository: `${parsedPr.owner}/${parsedPr.repo}`,
            pullRequestUrl,
            pullNumber: parsedPr.pullNumber,
            pullRequestTitle: pull.data.title,
            baseBranch: pull.data.base.ref,
            headBranch: pull.data.head.ref,
            status: "ALREADY_MERGED_TO_MAIN",
            featureStatus: "FEATURE_SHIPPED",
            merged: true,
            mergedById: session.user.id,
            mergedByName: session.user.name || "",
            mergedByEmail: session.user.email,
            mergedAt: new Date().toISOString(),
            message:
              "Senior Technical Engineer approved this pull request. GitHub already showed it as merged into main.",
          }),
        },
      });

      return NextResponse.json({
        ok: true,
        status: "ALREADY_MERGED_TO_MAIN",
        auditLogId: auditLog.id,
        summaryId,
        pullRequest: {
          url: pullRequestUrl,
          number: parsedPr.pullNumber,
          title: pull.data.title,
          baseBranch: pull.data.base.ref,
          headBranch: pull.data.head.ref,
        },
      });
    }

    const merge = await octokit.rest.pulls.merge({
      owner: parsedPr.owner,
      repo: parsedPr.repo,
      pull_number: parsedPr.pullNumber,
      commit_title: `Merge PR #${parsedPr.pullNumber}: ${pull.data.title}`,
      commit_message: `Approved by Senior Technical Engineer ${session.user.email} from Loom.`,
      merge_method: mergeMethod as "merge" | "squash" | "rebase",
    });

    const auditLog = await db.auditLog.create({
      data: {
        workspaceId: summaryLog.workspaceId,
        actorId: session.user.id,
        action: "senior.pr.approved_and_merged",
        entityType: "PullRequest",
        entityId: pullRequestUrl,
        metadata: JSON.stringify({
          summaryId,
          projectId: metadata.projectId || "",
          requestId: metadata.requestId || "",
          prdId: metadata.prdId || "",
          taskId: metadata.taskId || "",
          taskTitle: metadata.taskTitle || pull.data.title,
          repository: `${parsedPr.owner}/${parsedPr.repo}`,
          pullRequestUrl,
          pullNumber: parsedPr.pullNumber,
          pullRequestTitle: pull.data.title,
          baseBranch: pull.data.base.ref,
          headBranch: pull.data.head.ref,
          status: "MERGED_TO_MAIN",
          featureStatus: "FEATURE_SHIPPED",
          merged: merge.data.merged,
          mergeSha: merge.data.sha || "",
          mergedById: session.user.id,
          mergedByName: session.user.name || "",
          mergedByEmail: session.user.email,
          mergedAt: new Date().toISOString(),
          message:
            "Senior Technical Engineer approved the pull request and merged it into main. The implementation is now a shipped feature.",
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      status: "MERGED_TO_MAIN",
      auditLogId: auditLog.id,
      summaryId,
      mergeSha: merge.data.sha || "",
      message: merge.data.message || "Pull request merged into main",
      pullRequest: {
        url: pullRequestUrl,
        number: parsedPr.pullNumber,
        title: pull.data.title,
        baseBranch: pull.data.base.ref,
        headBranch: pull.data.head.ref,
      },
    });
  } catch (error: any) {
  console.error("senior approve and merge error", error);

  return NextResponse.json(
    {
      ok: false,
      error:
        error?.message ||
        "Failed to approve and merge pull request",
      githubStatus: error?.status || null,
      githubDocumentationUrl: error?.documentation_url || null,
      acceptedGitHubPermissions:
        error?.response?.headers?.["x-accepted-github-permissions"] || null,
      requiredFix:
        "Use a GitHub token with write access to the base repository. For local testing, use a classic PAT with repo scope.",
    },
    { status: 500 },
  );
}
}