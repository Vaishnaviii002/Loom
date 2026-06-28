import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createUniqueWorkspaceSlug(baseName: string, userId: string) {
  const baseSlug = createSlug(baseName) || "workspace";
  const userSuffix = createSlug(userId).slice(0, 8) || Date.now().toString();

  let slug = `${baseSlug}-${userSuffix}`;
  let counter = 1;

  while (
    await db.workspace.findFirst({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    })
  ) {
    slug = `${baseSlug}-${userSuffix}-${counter}`;
    counter++;
  }

  return slug;
}

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    const existingMembership = await db.membership.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (existingMembership) {
      return NextResponse.json({
        ok: true,
        message: "Membership already exists.",
        role: existingMembership.role,
      });
    }

    const workspaceName =
      session.user.name?.trim() ||
      session.user.email?.split("@")[0]?.trim() ||
      "My Workspace";

    const finalWorkspaceName = `${workspaceName}'s Workspace`;

    const workspaceSlug = await createUniqueWorkspaceSlug(
      finalWorkspaceName,
      session.user.id,
    );

    const workspace = await db.workspace.create({
      data: {
        name: finalWorkspaceName,
        slug: workspaceSlug,
      },
    });

    const membership = await db.membership.create({
      data: {
        userId: session.user.id,
        workspaceId: workspace.id,
        role: "ADMIN",
      },
    });

    return NextResponse.json({
      ok: true,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      membershipId: membership.id,
      role: membership.role,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create admin workspace.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}