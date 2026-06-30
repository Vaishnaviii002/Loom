import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Octokit } from "@octokit/rest";
import OpenAI from "openai";
import { db } from "@shipflow/db";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type ReviewIssue = {
  severity: "BLOCKING" | "NON_BLOCKING";
  file?: string;
  issue: string;
  recommendation: string;
};

type AiReviewResult = {
  status: "FIX_REQUIRED" | "AI_APPROVED";
  summary: string;
  issues: ReviewIssue[];
};

type ChangedFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
};

type DevelopmentTaskMetadata = {
  prdId?: string;
  requestId?: string;
  projectId?: string;
  projectName?: string;
  repository?: string;
  title?: string;
  finalContent?: string;
  tasks?: unknown[];
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

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength)}\n\n[TRUNCATED: content was too large]`;
}

function toAuditMetadata(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function parseAuditMetadata(value: string | null): DevelopmentTaskMetadata {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as DevelopmentTaskMetadata;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function parsePullRequestInput(input: string) {
  const value = input.trim();

  const githubUrlMatch = value.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/)?$/,
  );

  if (githubUrlMatch) {
    return {
      owner: githubUrlMatch[1],
      repo: githubUrlMatch[2],
      pullNumber: Number(githubUrlMatch[3]),
      repoFullName: `${githubUrlMatch[1]}/${githubUrlMatch[2]}`,
    };
  }

  const shortMatch = value.match(/^([^/\s]+)\/([^#\s]+)#(\d+)$/);

  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      pullNumber: Number(shortMatch[3]),
      repoFullName: `${shortMatch[1]}/${shortMatch[2]}`,
    };
  }

  return null;
}

function normalizeAiReview(value: unknown): AiReviewResult {
  const raw = value as Partial<AiReviewResult>;

  const issues = Array.isArray(raw.issues)
    ? raw.issues.map((issue) => {
        const item = issue as Partial<ReviewIssue>;

        return {
          severity:
            item.severity === "BLOCKING" || item.severity === "NON_BLOCKING"
              ? item.severity
              : "NON_BLOCKING",
          file: safeString(item.file),
          issue:
            safeString(item.issue) ||
            "AI detected a review concern but did not provide details.",
          recommendation:
            safeString(item.recommendation) ||
            "Review the implementation against the PRD and assigned task.",
        };
      })
    : [];

  const hasBlockingIssue = issues.some(
    (issue) => issue.severity === "BLOCKING",
  );

  return {
    status:
      raw.status === "AI_APPROVED" && !hasBlockingIssue
        ? "AI_APPROVED"
        : "FIX_REQUIRED",
    summary:
      safeString(raw.summary) ||
      "AI reviewed the pull request against the finalized PRD and assigned task.",
    issues,
  };
}

function buildChangedFilesForAi(files: ChangedFile[]) {
  return files
    .map((file) => {
      return [
        `FILE: ${file.filename}`,
        `STATUS: ${file.status}`,
        `ADDITIONS: ${file.additions}`,
        `DELETIONS: ${file.deletions}`,
        `CHANGES: ${file.changes}`,
        "PATCH:",
        file.patch || "[No patch returned by GitHub for this file]",
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function buildGitHubReviewComment(review: AiReviewResult) {
  const statusLabel =
    review.status === "AI_APPROVED"
      ? "AI Approved - Ready for Human Review"
      : "Fix Required";

  const issuesText =
    review.issues.length > 0
      ? review.issues
          .map((issue, index) => {
            return [
              `### ${index + 1}. ${issue.severity}`,
              issue.file ? `**File:** \`${issue.file}\`` : "",
              `**Issue:** ${issue.issue}`,
              `**Recommendation:** ${issue.recommendation}`,
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n")
      : "No blocking issues found.";

  return [
    `## Loom AI Review: ${statusLabel}`,
    "",
    `**Summary:** ${review.summary}`,
    "",
    "## Issues",
    "",
    issuesText,
    "",
    "---",
    "This review was generated from the real GitHub pull request diff and compared against the PM-approved PRD and assigned developer tasks.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();

const projectId = safeString(body.projectId);
const requestId = safeString(body.requestId);
const taskId = safeString(body.taskId);
const taskTitle = safeString(body.taskTitle);
const prInput = safeString(body.prInput);

const taskSummary = safeString(body.taskSummary);
const taskArea = safeString(body.taskArea);
const ownerRole = safeString(body.ownerRole);
const workItems = Array.isArray(body.workItems) ? body.workItems : [];
const acceptanceCriteria = Array.isArray(body.acceptanceCriteria)
  ? body.acceptanceCriteria
  : [];
const affectedFiles = Array.isArray(body.affectedFiles)
  ? body.affectedFiles
  : [];

    if (!projectId) {
      return jsonError("projectId is required");
    }

    if (!requestId) {
      return jsonError("requestId is required");
    }

    if (!prInput) {
      return jsonError("Pull request URL is required");
    }

    const parsedPr = parsePullRequestInput(prInput);

    if (!parsedPr) {
      return jsonError(
        "Invalid PR input. Use https://github.com/owner/repo/pull/12 or owner/repo#12",
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return jsonError("GITHUB_TOKEN is missing in environment variables", 500);
    }

    const openAiKey = process.env.OPENAI_API_KEY;

    if (!openAiKey) {
      return jsonError(
        "OPENAI_API_KEY is missing in environment variables",
        500,
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

    const connectedRepo = project.gitHubRepo;

    if (!connectedRepo) {
      return jsonError("No GitHub repository is connected to this project");
    }

    const connectedRepoFullName = connectedRepo.repoFullName;

    if (
      connectedRepoFullName.toLowerCase() !==
      parsedPr.repoFullName.toLowerCase()
    ) {
      return jsonError(
        `This pull request belongs to ${parsedPr.repoFullName}, but this project is connected to ${connectedRepoFullName}`,
      );
    }

    if (!session?.user?.id || !session.user.email) {
      return jsonError("Unauthorized", 401);
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
        email: session.user.email || "",
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

    const taskLogs = await db.auditLog.findMany({
      where: {
        workspaceId: project.workspaceId,
        action: "pm.prd.sent_to_development",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const taskLog = taskLogs.find((log) => {
      const metadata = parseAuditMetadata(log.metadata);

      return (
        safeString(metadata.projectId) === projectId &&
        safeString(metadata.requestId) === requestId
      );
    });

    if (!taskLog) {
      return jsonError(
        "No PM-approved development task found for this request",
      );
    }

    const taskMetadata = parseAuditMetadata(taskLog.metadata);

    const octokit = new Octokit({
      auth: githubToken,
    });

    const { data: pullRequest } = await octokit.rest.pulls.get({
      owner: parsedPr.owner,
      repo: parsedPr.repo,
      pull_number: parsedPr.pullNumber,
    });

    const pullFiles = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner: parsedPr.owner,
      repo: parsedPr.repo,
      pull_number: parsedPr.pullNumber,
      per_page: 100,
    });

    const changedFiles: ChangedFile[] = pullFiles.map((file) => {
      return {
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: truncateText(file.patch || "", 12000),
      };
    });

    if (changedFiles.length === 0) {
      return jsonError("GitHub returned no changed files for this PR");
    }

    const totalAdditions = changedFiles.reduce(
      (sum, file) => sum + file.additions,
      0,
    );

    const totalDeletions = changedFiles.reduce(
      (sum, file) => sum + file.deletions,
      0,
    );

    const rawDiff = buildChangedFilesForAi(changedFiles);

    const savedPullRequest = await db.pullRequest.upsert({
      where: {
        repoId_prNumber: {
          repoId: connectedRepo.id,
          prNumber: pullRequest.number,
        },
      },
      update: {
        title: pullRequest.title,
        state: pullRequest.state,
        url: pullRequest.html_url,
        branch: pullRequest.head.ref,
        baseBranch: pullRequest.base.ref,
        author: pullRequest.user?.login || null,
        changedFiles: changedFiles.length,
        additions: totalAdditions,
        deletions: totalDeletions,
        lastSyncedAt: new Date(),
      },
      create: {
        repoId: connectedRepo.id,
        prNumber: pullRequest.number,
        title: pullRequest.title,
        state: pullRequest.state,
        url: pullRequest.html_url,
        branch: pullRequest.head.ref,
        baseBranch: pullRequest.base.ref,
        author: pullRequest.user?.login || null,
        changedFiles: changedFiles.length,
        additions: totalAdditions,
        deletions: totalDeletions,
      },
    });

    const openai = new OpenAI({
      apiKey: openAiKey,
    });

    const aiInput = {
      project: {
        id: project.id,
        name: project.name,
        repository: connectedRepoFullName,
      },
      pullRequest: {
        number: pullRequest.number,
        title: pullRequest.title,
        state: pullRequest.state,
        url: pullRequest.html_url,
        author: pullRequest.user?.login,
        baseBranch: pullRequest.base.ref,
        headBranch: pullRequest.head.ref,
      },
      pmApprovedPrd: taskMetadata.finalContent || "",
      assignedDevelopmentTasks: Array.isArray(taskMetadata.tasks)
        ? taskMetadata.tasks
        : [],
      changedFiles: changedFiles.map((file) => {
        return {
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
        };
      }),
      diffs: rawDiff,
    };

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: [
            "You are Loom's senior AI code reviewer.",
            "You must review only the real GitHub pull request diff provided by the platform.",
            "Compare the implementation against the PM-approved PRD and the assigned development task cards.",
            "Do not invent files, code, functions, bugs, or requirements.",
            "Do not return generic review comments.",
            "Your response must be specific to the changed files and patches.",
            "If the PR does not satisfy the PRD or task, return FIX_REQUIRED.",
            "If a required implementation is missing, return FIX_REQUIRED.",
            "If there is a blocking bug, broken flow, security issue, missing acceptance criteria, or incomplete behavior, return FIX_REQUIRED.",
            "Return AI_APPROVED only when the real diff satisfies the PRD and has no blocking issues.",
            "Return strict JSON only.",
            "JSON shape:",
            "{",
            '  "status": "FIX_REQUIRED" | "AI_APPROVED",',
            '  "summary": "specific review summary based on real diff",',
            '  "issues": [',
            "    {",
            '      "severity": "BLOCKING" | "NON_BLOCKING",',
            '      "file": "changed file path if relevant",',
            '      "issue": "specific issue found from the diff",',
            '      "recommendation": "specific fix recommendation"',
            "    }",
            "  ]",
            "}",
          ].join("\n"),
        },
        {
          role: "user",
          content: truncateText(JSON.stringify(aiInput, null, 2), 90000),
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      return jsonError("OpenAI returned an empty review", 500);
    }

    let parsedAi: unknown;

    try {
      parsedAi = JSON.parse(rawContent);
    } catch {
      return jsonError("OpenAI returned invalid JSON review", 500);
    }

    const review = normalizeAiReview(parsedAi);

    const finalStatus =
      review.status === "AI_APPROVED"
        ? "READY_FOR_HUMAN_REVIEW"
        : "FIX_REQUIRED";

    const snapshot = await db.reviewSnapshot.create({
      data: {
        pullRequestId: savedPullRequest.id,
        summary: review.summary,
        status: finalStatus,
        rawDiff: truncateText(rawDiff, 60000),
        aiResult: JSON.stringify(review),
      },
    });

    const reviewRun = await db.reviewRun.create({
      data: {
        snapshotId: snapshot.id,
        status: "COMPLETE",
        summary: review.summary,
        completedAt: new Date(),
      },
    });

    if (review.issues.length > 0) {
      await db.finding.createMany({
        data: review.issues.map((issue) => {
          return {
            reviewRunId: reviewRun.id,
            type: "AI_PR_REVIEW",
            severity: issue.severity,
            title: truncateText(issue.issue, 160),
            description: issue.issue,
            filePath: issue.file || null,
            suggestion: issue.recommendation,
          };
        }),
      });
    }

    let githubCommentStatus = "POSTED";
    let githubCommentError = "";

    try {
      await octokit.rest.issues.createComment({
        owner: parsedPr.owner,
        repo: parsedPr.repo,
        issue_number: parsedPr.pullNumber,
        body: buildGitHubReviewComment(review),
      });
    } catch (error) {
      githubCommentStatus = "FAILED";
      githubCommentError =
        error instanceof Error
          ? error.message
          : "Failed to post GitHub comment";
    }

    await db.auditLog.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: session.user.id,
        action: "developer.pr.ai_reviewed",
        entityType: "PullRequest",
        entityId: pullRequest.html_url,
        metadata: toAuditMetadata({
          projectId,
          requestId,
          prdId: taskMetadata.prdId || "",
          repository: connectedRepoFullName,
          pullNumber: pullRequest.number,
          pullRequestUrl: pullRequest.html_url,
          pullRequestTitle: pullRequest.title,
          pullRequestState: pullRequest.state,
          pullRequestDbId: savedPullRequest.id,
          reviewSnapshotId: snapshot.id,
          reviewRunId: reviewRun.id,
          changedFiles: changedFiles.map((file) => {
            return {
              filename: file.filename,
              status: file.status,
              additions: file.additions,
              deletions: file.deletions,
              changes: file.changes,
            };
          }),
          review,
          status: finalStatus,
          githubCommentStatus,
          githubCommentError,
          createdAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      status: finalStatus,
      review,
      pullRequest: {
        id: savedPullRequest.id,
        number: pullRequest.number,
        title: pullRequest.title,
        state: pullRequest.state,
        url: pullRequest.html_url,
      },
      changedFiles: changedFiles.map((file) => {
        return {
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
        };
      }),
      githubComment: {
        status: githubCommentStatus,
        error: githubCommentError,
      },
    });
  } catch (error) {
    console.error("developer pull request review error", error);

    return jsonError(
      error instanceof Error ? error.message : "Failed to review pull request",
      500,
    );
  }
}
