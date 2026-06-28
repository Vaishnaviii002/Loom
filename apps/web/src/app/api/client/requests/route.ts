import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeRequestType(value: string) {
  const allowed = ["FEATURE", "BUG", "CHANGE", "IMPROVEMENT", "NEW_PRODUCT"];

  if (value === "OTHER") {
    return "CHANGE";
  }

  if (allowed.includes(value)) {
    return value;
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const projectId = String(body.projectId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const type = normalizeRequestType(String(body.type ?? "FEATURE").trim());
    const priority = normalizePriority(String(body.priority ?? "MEDIUM").trim());
    const rawDescription = String(body.rawDescription ?? "").trim();

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

    const ticket = await db.featureRequest.create({
      data: {
        projectId,
        clientId: session.user.id,
        title,
        type: type as any,
        priority: priority as any,
        status: "SUBMITTED" as any,
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
            projectName: access.project.name,
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create request.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}