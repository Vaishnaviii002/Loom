import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@shipflow/db";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type ReviewIssue = {
  severity: "BLOCKING" | "NON_BLOCKING";
  file?: string;
  issue: string;
  recommendation: string;
};

type ChangedFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
};

type CurrentReview = {
  status?: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
  review?: {
    status: "FIX_REQUIRED" | "AI_APPROVED";
    summary: string;
    issues: ReviewIssue[];
  };
  changedFiles?: ChangedFile[];
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  pullNumber?: number;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status },
  );
}

function safeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim();
}

function toAuditMetadata(value: Record<string, unknown>) {
  return JSON.stringify(value);
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

    const projectId = safeString(body.projectId);
    const requestId = safeString(body.requestId);
    const prdId = safeString(body.prdId);
    const taskId = safeString(body.taskId);
    const taskTitle = safeString(body.taskTitle);
    const taskSummary = safeString(body.taskSummary);
    const ownerRole = safeString(body.ownerRole);
    const currentReview = (body.currentReview || null) as CurrentReview | null;

    if (!projectId) return jsonError("projectId is required");
    if (!requestId) return jsonError("requestId is required");
    if (!taskId) return jsonError("taskId is required");

    if (currentReview?.status !== "READY_FOR_HUMAN_REVIEW") {
      return jsonError(
        "AI review must be approved before sending to senior engineer",
      );
    }

    const project = await db.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        gitHubRepo: true,
      },
    });

    if (!project) {
      return jsonError("Project not found", 404);
    }

    const projectMember = await db.clientProjectMember.findFirst({
      where: {
        projectId,
        userId: session.user.id,
        role: {
          in: ["DEVELOPER", "ADMIN"],
        },
      },
    });

    const workspaceDeveloper = await db.membership.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId: session.user.id,
        role: "DEVELOPER",
      },
    });

    const workspaceAdmin = await db.membership.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId: session.user.id,
        role: "ADMIN",
      },
    });

    const acceptedDeveloperInvite = await db.invite.findFirst({
      where: {
        projectId,
        email: session.user.email,
        role: "DEVELOPER",
        status: "ACCEPTED",
      },
    });

    if (
      !projectMember &&
      !workspaceDeveloper &&
      !workspaceAdmin &&
      !acceptedDeveloperInvite
    ) {
      return jsonError("You do not have developer access to this project", 403);
    }

    const repository =
      project.gitHubRepo?.repoFullName ||
      currentReview?.pullRequestUrl
        ?.split("github.com/")[1]
        ?.split("/pull/")[0] ||
      "";

    const failedAttempts =
      currentReview?.review?.issues && currentReview.review.issues.length > 0
        ? [
            {
              pullRequestUrl: currentReview.pullRequestUrl || "",
              summary: currentReview.review.summary,
              issues: currentReview.review.issues,
              createdAt: new Date().toISOString(),
            },
          ]
        : [];

    const finalChanges = (currentReview?.changedFiles || []).map((file) => {
      return {
        file: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      };
    });

    const summary = {
      title: `Senior review summary for ${taskTitle || "developer task"}`,
      executiveSummary:
        currentReview?.review?.summary ||
        `The task "${taskTitle}" is ready for senior technical review.`,
      pullRequestSummary: {
        pullRequestUrl: currentReview?.pullRequestUrl || "",
        pullRequestTitle: currentReview?.pullRequestTitle || "",
        pullNumber: currentReview?.pullNumber || null,
        repository,
      },
      taskSummary: {
        title: taskTitle,
        ownerRole,
        summary: taskSummary,
      },
      failedAttempts,
      finalChanges,
      implementedChanges: finalChanges.map((file) => ({
        title: `Updated ${file.file}`,
        description: `Implemented a ${file.status} change in ${file.file} with +${file.additions} additions, -${file.deletions} deletions, and ${file.changes} total changes.`,
        files: [file.file],
      })),

      pullRequests: [
        {
          pullRequestUrl: currentReview?.pullRequestUrl || "",
          pullRequestTitle: currentReview?.pullRequestTitle || "",
          pullNumber: currentReview?.pullNumber || null,
          repository,
          status: currentReview?.status || "READY_FOR_HUMAN_REVIEW",
          aiDecision: currentReview?.review?.status || "AI_APPROVED",
          changedFiles: finalChanges,
          issues: currentReview?.review?.issues || [],
        },
      ],
      aiDecision: "READY_FOR_HUMAN_REVIEW",
      seniorChecklist: [
        "Review the final GitHub pull request.",
        "Confirm the implementation matches the PM-approved task.",
        "Verify changed files are expected for the requested work.",
        "Confirm no blocking AI issues remain.",
        "Approve, reject, or request changes as the final human reviewer.",
      ],
      reviewerNotes:
        "This summary was generated from the developer task, real GitHub PR review result, changed files, and AI review decision.",
    };

    const auditLog = await db.auditLog.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: session.user.id,
        action: "developer.pr.sent_to_senior",
        entityType: "SeniorReviewSummary",
        entityId:
          currentReview?.pullRequestUrl ||
          `${projectId}:${requestId}:${taskId}`,
        metadata: toAuditMetadata({
          projectId,
          requestId,
          prdId,
          taskId,
          taskTitle,
          ownerRole,
          repository,
          pullRequestUrl: currentReview?.pullRequestUrl || "",
          pullRequestTitle: currentReview?.pullRequestTitle || "",
          pullNumber: currentReview?.pullNumber || null,
          status: "SENT_TO_SENIOR_REVIEW",
          summary,
          createdAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      summaryId: auditLog.id,
      status: "SENT_TO_SENIOR_REVIEW",
      summary,
      createdAt: auditLog.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("send to senior engineer error", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to send summary to senior engineer",
      500,
    );
  }
}
