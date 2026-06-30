import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@shipflow/db";

export const runtime = "nodejs";

type GitHubWebhookPayload = {
  action?: string;
  repository?: {
    full_name?: string;
    html_url?: string;
    default_branch?: string;
  };
  sender?: {
    login?: string;
  };
  pull_request?: {
    number?: number;
    title?: string;
    state?: string;
    html_url?: string;
    changed_files?: number;
    additions?: number;
    deletions?: number;
    user?: {
      login?: string;
    };
    head?: {
      ref?: string;
    };
    base?: {
      ref?: string;
    };
  };
};

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function verifyGitHubSignature({
  rawBody,
  signature,
  secret,
}: {
  rawBody: string;
  signature: string | null;
  secret: string;
}) {
  if (!signature) return false;

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

function toAuditMetadata(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
      return jsonResponse(
        {
          ok: false,
          error: "GITHUB_WEBHOOK_SECRET is missing",
        },
        500,
      );
    }

    const rawBody = await req.text();

    const signature = req.headers.get("x-hub-signature-256");
    const event = req.headers.get("x-github-event") || "unknown";
    const deliveryId = req.headers.get("x-github-delivery") || "";

    const isValid = verifyGitHubSignature({
      rawBody,
      signature,
      secret,
    });

    if (!isValid) {
      return jsonResponse(
        {
          ok: false,
          error: "Invalid GitHub webhook signature",
        },
        401,
      );
    }

    const payload = JSON.parse(rawBody) as GitHubWebhookPayload;

    const repositoryFullName = payload.repository?.full_name;

    if (!repositoryFullName) {
      return jsonResponse({
        ok: true,
        ignored: true,
        reason: "No repository found in webhook payload",
      });
    }

    const connectedRepo = await db.gitHubRepo.findFirst({
      where: {
        repoFullName: repositoryFullName,
      },
      include: {
        project: true,
      },
    });

    if (!connectedRepo) {
      return jsonResponse({
        ok: true,
        ignored: true,
        reason: "Repository is not connected to any Loom project",
        repository: repositoryFullName,
      });
    }

    const project = connectedRepo.project;
    const pullRequest = payload.pull_request;

    if (pullRequest?.number) {
      await db.pullRequest.upsert({
        where: {
          repoId_prNumber: {
            repoId: connectedRepo.id,
            prNumber: pullRequest.number,
          },
        },
        update: {
          title: pullRequest.title || "Untitled pull request",
          state: pullRequest.state || "unknown",
          url: pullRequest.html_url || "",
          branch: pullRequest.head?.ref || null,
          baseBranch: pullRequest.base?.ref || null,
          author: pullRequest.user?.login || null,
          changedFiles: pullRequest.changed_files || 0,
          additions: pullRequest.additions || 0,
          deletions: pullRequest.deletions || 0,
          lastSyncedAt: new Date(),
        },
        create: {
          repoId: connectedRepo.id,
          prNumber: pullRequest.number,
          title: pullRequest.title || "Untitled pull request",
          state: pullRequest.state || "unknown",
          url: pullRequest.html_url || "",
          branch: pullRequest.head?.ref || null,
          baseBranch: pullRequest.base?.ref || null,
          author: pullRequest.user?.login || null,
          changedFiles: pullRequest.changed_files || 0,
          additions: pullRequest.additions || 0,
          deletions: pullRequest.deletions || 0,
        },
      });
    }

    await db.auditLog.create({
      data: {
        workspaceId: project.workspaceId,
        actorId: null,
        action: `github.${event}`,
        entityType: "GitHubWebhook",
        entityId:
          pullRequest?.html_url ||
          payload.repository?.html_url ||
          repositoryFullName,
        metadata: toAuditMetadata({
          deliveryId,
          event,
          action: payload.action || "",
          repository: repositoryFullName,
          projectId: project.id,
          projectName: project.name,
          pullRequestNumber: pullRequest?.number || null,
          pullRequestUrl: pullRequest?.html_url || "",
          pullRequestTitle: pullRequest?.title || "",
          pullRequestState: pullRequest?.state || "",
          sender: payload.sender?.login || "",
          createdAt: new Date().toISOString(),
        }),
      },
    });

    return jsonResponse({
      ok: true,
      event,
      repository: repositoryFullName,
      projectId: project.id,
    });
  } catch (error) {
    console.error("github webhook error", error);

    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process GitHub webhook",
      },
      500,
    );
  }
}