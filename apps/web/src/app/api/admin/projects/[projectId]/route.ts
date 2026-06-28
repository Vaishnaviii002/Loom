import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project id is required." },
        { status: 400 },
      );
    }

    const membership = await db.membership.findFirst({
      where: {
        userId: session.user.id,
        role: "ADMIN" as any,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Only admins can delete projects." },
        { status: 403 },
      );
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        workspaceId: membership.workspaceId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 },
      );
    }

    await db.auditLog
      .create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: session.user.id,
          action: "project.deleted",
          entityType: "Project",
          entityId: project.id,
          metadata: JSON.stringify({
            name: project.name,
          }),
        },
      })
      .catch(() => null);

    await db.project.delete({
      where: {
        id: project.id,
      },
    });

    return NextResponse.json({
      ok: true,
      deletedProjectId: project.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete project.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}