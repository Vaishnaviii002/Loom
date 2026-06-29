import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

function parseMetadata(metadata: unknown) {
  try {
    if (typeof metadata === "string") {
      return JSON.parse(metadata);
    }

    return JSON.parse(JSON.stringify(metadata ?? {}));
  } catch {
    return null;
  }
}

async function getPmProjectAccess({
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

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    const projectId = sanitizeText(String(searchParams.get("projectId") ?? ""));
    const prdId = sanitizeText(String(searchParams.get("prdId") ?? ""));
    const requestId = sanitizeText(String(searchParams.get("requestId") ?? ""));

    if (!projectId || !prdId || !requestId) {
      return NextResponse.json(
        { error: "Task lookup data is incomplete." },
        { status: 400 },
      );
    }

    const access = await getPmProjectAccess({
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

    const logs = await db.auditLog.findMany({
      where: {
        workspaceId: access.project.workspaceId,
        action: {
          in: ["pm.prd.sent_to_development", "pm.prd.tasks_analyzed"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    const matchedLog = logs.find((log) => {
      const metadata = parseMetadata(log.metadata);

      return (
        metadata?.projectId === projectId &&
        metadata?.prdId === prdId &&
        metadata?.requestId === requestId &&
        Array.isArray(metadata?.tasks)
      );
    });

    if (!matchedLog) {
      return NextResponse.json({
        ok: true,
        status: "EMPTY",
        tasks: [],
      });
    }

    const metadata = parseMetadata(matchedLog.metadata);

    return NextResponse.json({
      ok: true,
      status: metadata?.status ?? "TASKS_ANALYZED",
      tasks: Array.isArray(metadata?.tasks) ? metadata.tasks : [],
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load development tasks." },
      { status: 500 },
    );
  }
}