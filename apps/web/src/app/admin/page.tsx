import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./admin-dashboard-client";


export default async function AdminPage() {
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
    include: {
      workspace: {
        include: {
          projects: {
            include: {
              gitHubRepo: true,
              featureRequests: true,

              clientAccesses: {
                include: {
                  client: true,
                },
                orderBy: {
                  id: "desc",
                },
              },

              invites: {
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },

          memberships: {
            include: {
              user: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/auth/redirect");
  }

  if (membership.role !== "ADMIN") {
    redirect("/auth/redirect");
  }

  const workspace = membership.workspace;

  const projects = workspace.projects.map((project: any) => {
    const acceptedClients =
      project.clientAccesses?.map((access: any) => ({
        id: access.id,
        role: "CLIENT",
        status: "ACCEPTED",
        createdAt: access.client?.createdAt?.toISOString?.() ?? "",
        user: {
          name: access.client?.name ?? "Client",
          email: access.client?.email ?? "",
        },
      })) ?? [];

    const invitedPeople =
      project.invites?.map((invite: any) => ({
        id: invite.id,
        role: invite.role,
        status: invite.status,
        createdAt: invite.createdAt?.toISOString?.() ?? "",
        user: {
          name:
            invite.status === "ACCEPTED"
              ? "Joined user"
              : "Pending invite",
          email: invite.email ?? "",
        },
      })) ?? [];

    const mergedMembersMap = new Map<string, any>();

    for (const member of invitedPeople) {
      if (member.user.email) {
        mergedMembersMap.set(member.user.email, member);
      }
    }

    for (const member of acceptedClients) {
      if (member.user.email) {
        mergedMembersMap.set(member.user.email, member);
      }
    }

    return {
      id: project.id,
      name: project.name ?? "Untitled project",
      description: project.description ?? "",
      type: project.type ?? "EXISTING",
      techStack: project.techStack ?? "",
      existingFeatures: project.existingFeatures ?? "",
      businessGoals: project.businessGoals ?? "",
      createdAt: project.createdAt?.toISOString?.() ?? "",
      requestCount: project.featureRequests?.length ?? 0,

      repo: project.gitHubRepo
        ? {
            repoFullName: project.gitHubRepo.repoFullName,
          }
        : null,

      members: Array.from(mergedMembersMap.values()),
    };
  });

  const workspaceMembers = workspace.memberships.map((item: any) => ({
    id: item.id,
    role: item.role,
    status: "WORKSPACE",
    createdAt: item.createdAt?.toISOString?.() ?? "",
    user: {
      name: item.user?.name ?? "Member",
      email: item.user?.email ?? "",
    },
  }));

  return (
    <AdminDashboardClient
      user={{
        name: session.user.name ?? "Admin",
        email: session.user.email ?? "",
        role: membership.role,
      }}
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      }}
      projects={projects}
      members={workspaceMembers}
    />
  );
}