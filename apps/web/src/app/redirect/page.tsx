import { getCurrentSession, getPrimaryMembership, routeForRole } from "@/lib/role-routing";
import { redirect } from "next/navigation";

export default async function RedirectPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const membership = await getPrimaryMembership(session.user.id);

  if (!membership) {
    redirect("/onboarding/workspace");
  }

  redirect(routeForRole(membership.role));
}