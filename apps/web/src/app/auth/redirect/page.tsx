import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
      where: { slug },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${userSuffix}-${counter}`;
    counter++;
  }

  return slug;
}

export default async function AuthRedirectPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  let membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
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

    membership = await db.membership.create({
      data: {
        userId: session.user.id,
        workspaceId: workspace.id,
        role: "ADMIN",
      },
    });
  }

  if (membership.role === "ADMIN") {
    redirect("/admin");
  }

  if (membership.role === "PM") {
    redirect("/pm");
  }

  if (membership.role === "DEVELOPER") {
    redirect("/dev");
  }

  if (membership.role === "SENIOR_ENG") {
    redirect("/review");
  }

  if (membership.role === "CLIENT") {
    const projectAccess = await db.clientProjectAccess.findFirst({
      where: {
        clientId: session.user.id,
      },
      orderBy: {
        project: {
          createdAt: "desc",
        },
      },
    });

    if (projectAccess?.projectId) {
      redirect(`/client/dashboard?projectId=${projectAccess.projectId}`);
    }

    redirect("/client/dashboard");
  }

  redirect("/admin");
}