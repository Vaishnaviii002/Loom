import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function PortalRedirectPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/auth/redirect");
  }

  if (membership.role === "ADMIN") redirect("/admin");
  if (membership.role === "PM") redirect("/pm");
  if (membership.role === "DEVELOPER") redirect("/dev");
  if (membership.role === "SENIOR_ENG") redirect("/review");

  if (membership.role === "CLIENT") {
    const access = await db.clientProjectAccess.findFirst({
      where: {
        clientId: session.user.id,
      },
      orderBy: {
        project: {
          createdAt: "desc",
        },
      },
    });

    if (access?.projectId) {
      redirect(`/client/dashboard?projectId=${access.projectId}`);
    }

    redirect("/client/dashboard");
  }

  redirect("/auth/redirect");
}