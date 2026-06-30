import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
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
  repository?: string;
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  pullNumber?: number | null;
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
    const decision = safeString(body.decision);
    const reason = safeString(body.reason);

    if (!summaryId) return jsonError("summaryId is required");

    if (decision !== "REQUEST_CHANGES" && decision !== "REJECT") {
      return jsonError("decision must be REQUEST_CHANGES or REJECT");
    }

    if (!reason) {
      return jsonError("Reason is required");
    }

    const summaryLog = await db.auditLog.findUnique({
      where: { id: summaryId },
    });

    if (!summaryLog) {
      return jsonError("Senior review summary not found", 404);
    }

    if (summaryLog.action !== "developer.pr.sent_to_senior") {
      return jsonError("This summary is not ready for senior review");
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
      return jsonError("Admin preview is read-only", 403);
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

    const action =
      decision === "REQUEST_CHANGES"
        ? "senior.pr.changes_requested"
        : "senior.pr.rejected";

    const status =
      decision === "REQUEST_CHANGES" ? "CHANGES_REQUESTED" : "REJECTED";

    const auditLog = await db.auditLog.create({
      data: {
        workspaceId: summaryLog.workspaceId,
        actorId: session.user.id,
        action,
        entityType: "SeniorReviewSummary",
        entityId: summaryId,
        metadata: JSON.stringify({
          summaryId,
          projectId: metadata.projectId || "",
          requestId: metadata.requestId || "",
          prdId: metadata.prdId || "",
          taskId: metadata.taskId || "",
          taskTitle: metadata.taskTitle || "",
          repository: metadata.repository || "",
          pullRequestUrl: metadata.pullRequestUrl || "",
          pullRequestTitle: metadata.pullRequestTitle || "",
          pullNumber: metadata.pullNumber || null,
          status,
          reason,
          seniorEngineerId: session.user.id,
          seniorEngineerName: session.user.name || "",
          seniorEngineerEmail: session.user.email,
          createdAt: new Date().toISOString(),
          message:
            decision === "REQUEST_CHANGES"
              ? "Senior Technical Engineer requested changes before merge."
              : "Senior Technical Engineer rejected this implementation.",
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      status,
      auditLogId: auditLog.id,
      summaryId,
      reason,
      createdAt: auditLog.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("senior request changes error", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to submit senior decision",
      500,
    );
  }
}