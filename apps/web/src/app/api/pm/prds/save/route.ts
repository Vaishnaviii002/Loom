import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type SentPrdMetadata = {
  prdId?: string;
  requestId?: string;
  projectId?: string;
  title?: string;
  content?: string;
  status?: string;
  sentAt?: string;
};

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

function parseMetadata(metadata: unknown): SentPrdMetadata | null {
  try {
    if (typeof metadata === "string") {
      return JSON.parse(metadata) as SentPrdMetadata;
    }

    return JSON.parse(JSON.stringify(metadata ?? {})) as SentPrdMetadata;
  } catch {
    return null;
  }
}

async function getProjectAccess({
  userId,
  email,
  projectId,
}: {
  userId: string;
  email: string;
  projectId: string;
}) {
  const membership = await db.membership.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    return null;
  }

  const isPm = membership.role === "PM";
  const isAdmin = membership.role === "ADMIN";

  if (!isPm && !isAdmin) {
    return null;
  }

  const project = await db.project.findFirst({
    where: isAdmin
      ? {
          id: projectId,
          workspaceId: membership.workspaceId,
        }
      : {
          id: projectId,
        },
    include: {
      gitHubRepo: true,
    },
  });

  if (!project) {
    return null;
  }

  if (isPm) {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email,
        role: "PM" as any,
        status: "ACCEPTED" as any,
        projectId,
      },
      select: {
        id: true,
      },
    });

    if (!acceptedInvite) {
      return null;
    }
  }

  return {
    membership,
    project,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const projectId = sanitizeText(String(body.projectId ?? ""));
    const prdId = sanitizeText(String(body.prdId ?? ""));
    const requestId = sanitizeText(String(body.requestId ?? ""));
    const title = sanitizeText(String(body.title ?? ""));
    const updatedContent = sanitizeText(String(body.updatedContent ?? ""));
    const pmNotes = sanitizeText(String(body.pmNotes ?? ""));
    const mode = sanitizeText(String(body.mode ?? "SAVE_CHANGES"));

    if (!projectId || !prdId || !requestId || !title || !updatedContent) {
      return NextResponse.json(
        { error: "PRD update data is incomplete." },
        { status: 400 },
      );
    }

    const access = await getProjectAccess({
      userId: session.user.id,
      email: session.user.email,
      projectId,
    });

    if (!access) {
      return NextResponse.json(
        { error: "You do not have access to this project." },
        { status: 403 },
      );
    }

    const sentLogs = await db.auditLog.findMany({
      where: {
        workspaceId: access.project.workspaceId,
        action: "client.prd.sent_to_pm",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    const sentPrd = sentLogs
      .map((log) => parseMetadata(log.metadata))
      .find(
        (item) =>
          item?.projectId === projectId &&
          item?.prdId === prdId &&
          item?.requestId === requestId,
      );

    if (!sentPrd) {
      return NextResponse.json(
        { error: "This PRD was not sent to this PM project." },
        { status: 404 },
      );
    }

    const isFinalizing = mode === "FINALIZE_PRD";
    const status = isFinalizing ? "FINALIZED_PRD" : "PM_UPDATES_SAVED";

    await db.auditLog.create({
      data: {
        workspaceId: access.project.workspaceId,
        actorId: session.user.id,
        action: isFinalizing ? "pm.prd.finalized" : "pm.prd.updated",
        entityType: "PRD",
        entityId: prdId,
        metadata: JSON.stringify({
          prdId,
          requestId,
          projectId,
          title,
          originalContent: sentPrd.content ?? "",
          updatedContent,
          finalContent: isFinalizing ? updatedContent : "",
          pmNotes,
          status,
          savedAt: new Date().toISOString(),
          finalizedAt: isFinalizing ? new Date().toISOString() : "",
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      prd: {
        prdId,
        requestId,
        projectId,
        title,
        originalContent: sentPrd.content ?? "",
        updatedContent,
        finalContent: isFinalizing ? updatedContent : "",
        pmNotes,
        status,
        sentAt: sentPrd.sentAt ?? "",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to save PM PRD changes." },
      { status: 500 },
    );
  }
}