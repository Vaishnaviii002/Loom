import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const REQUEST_TYPES = [
  "FEATURE",
  "BUG",
  "CHANGE",
  "IMPROVEMENT",
  "NEW_PRODUCT",
] as const;

type RequestTypeValue = (typeof REQUEST_TYPES)[number];

function normalizeRequestType(value: string): RequestTypeValue {
  if (value === "OTHER") {
    return "CHANGE";
  }

  if (REQUEST_TYPES.includes(value as RequestTypeValue)) {
    return value as RequestTypeValue;
  }

  return "FEATURE";
}

function normalizePriority(value: string) {
  const allowed = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  if (allowed.includes(value)) {
    return value;
  }

  return "MEDIUM";
}

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const projectId = sanitizeText(String(body.projectId ?? ""));
    const title = sanitizeText(String(body.title ?? ""));
    const type = normalizeRequestType(
      sanitizeText(String(body.type ?? "FEATURE")),
    );
    const priority = normalizePriority(
      sanitizeText(String(body.priority ?? "MEDIUM")),
    );
    const rawDescription = sanitizeText(String(body.rawDescription ?? ""));

    if (!projectId) {
      return NextResponse.json(
        { error: "Project id is required." },
        { status: 400 },
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Ticket title is required." },
        { status: 400 },
      );
    }

    if (!rawDescription) {
      return NextResponse.json(
        { error: "Ticket description is required." },
        { status: 400 },
      );
    }

    const membership = await db.membership.findFirst({
      where: {
        userId: session.user.id,
        role: "CLIENT" as any,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Only clients can create requests." },
        { status: 403 },
      );
    }

    const access = await db.clientProjectAccess.findFirst({
      where: {
        clientId: session.user.id,
        projectId,
      },
      include: {
        project: true,
      },
    });

    if (!access) {
      return NextResponse.json(
        { error: "You do not have access to this project." },
        { status: 403 },
      );
    }

    const clientId = session.user.id;

    const ticket = await db.featureRequest.create({
      data: {
        projectId,
        clientId,
        title,
        type: type as any,
        status: "SUBMITTED",
        rawDescription,
      },
    });

    await db.auditLog
      .create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: session.user.id,
          action: "client.ticket.created",
          entityType: "FeatureRequest",
          entityId: ticket.id,
          metadata: JSON.stringify({
            projectId,
            projectName: sanitizeText(access.project.name),
            title,
            type,
            priority,
          }),
        },
      })
      .catch(() => null);

    return NextResponse.json({
      ok: true,
      ticketId: ticket.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to create request." },
      { status: 500 },
    );
  }
}