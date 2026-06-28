import { db } from "@shipflow/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ShipFlowRole =
  | "ADMIN"
  | "PM"
  | "SENIOR_ENG"
  | "DEVELOPER"
  | "CLIENT";

export function routeForRole(role: ShipFlowRole) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "PM":
      return "/pm";
    case "SENIOR_ENG":
      return "/review";
    case "DEVELOPER":
      return "/dev";
    case "CLIENT":
      return "/portal";
    default:
      return "/login";
  }
}

export async function getCurrentSession() {
  const requestHeaders = await headers();

  return auth.api.getSession({
    headers: requestHeaders,
  });
}

export async function requireUser() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function getPrimaryMembership(userId: string) {
  return db.membership.findFirst({
    where: {
      userId,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function requireRole(allowedRoles: ShipFlowRole[]) {
  const session = await requireUser();

  const membership = await getPrimaryMembership(session.user.id);

  if (!membership) {
    redirect("/onboarding/workspace");
  }

  if (!allowedRoles.includes(membership.role as ShipFlowRole)) {
    redirect(routeForRole(membership.role as ShipFlowRole));
  }

  return {
    session,
    membership,
  };
}