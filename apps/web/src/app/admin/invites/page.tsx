import crypto from "node:crypto";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";

export const runtime = "nodejs";

type InvitePageProps = {
  searchParams: Promise<{
    projectId?: string;
    created?: string;
  }>;
};

const roleOptions = [
  {
    value: "CLIENT",
    title: "Client",
  },
  {
    value: "PM",
    title: "Product Manager",
  },
  {
    value: "DEVELOPER",
    title: "Developer",
  },
  {
    value: "SENIOR_ENG",
    title: "Senior Engineer",
  },
];

async function getAdminContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      role: "ADMIN" as any,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/auth/redirect");
  }

  return {
    session,
    membership,
  };
}

async function getBaseUrl() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  return `${protocol}://${host}`;
}

export default async function InviteMembersPage({
  searchParams,
}: InvitePageProps) {
  const { membership } = await getAdminContext();
  const resolvedSearchParams = await searchParams;

  const projects = await db.project.findMany({
    where: {
      workspaceId: membership.workspaceId,
    },
    include: {
      gitHubRepo: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (projects.length === 0) {
    return (
      <main className="min-h-screen bg-[#111111] px-6 py-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin"
            className="text-sm text-white/40 transition hover:text-white"
          >
            ← Back to admin
          </Link>

          <section className="mt-8 rounded-2xl border border-white/10 bg-[#171717] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
              Invite members
            </p>

            <h1 className="mt-3 text-3xl font-semibold">
              Create a project first
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
              Every invite belongs to a specific project. Create a project
              first, then invite people into that project.
            </p>

            <Link
              href="/admin/projects/new"
              className="mt-6 inline-flex rounded-xl bg-[#aa4825] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
            >
              Create project
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const selectedProject =
    projects.find((project) => project.id === resolvedSearchParams.projectId) ??
    projects[0];

  if (!resolvedSearchParams.projectId) {
    redirect(`/admin/invites?projectId=${selectedProject.id}`);
  }

  

  const createdInvite = resolvedSearchParams.created
    ? await db.invite.findFirst({
        where: {
          token: resolvedSearchParams.created,
          workspaceId: membership.workspaceId,
          projectId: selectedProject.id,
        },
      })
    : null;

  const baseUrl = await getBaseUrl();

  const createdInviteLink = createdInvite
    ? `${baseUrl}/invite/${createdInvite.token}`
    : "";

  async function createInvite(formData: FormData) {
    "use server";

    const { session, membership } = await getAdminContext();

    const projectId = String(formData.get("projectId") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const roleInput = String(formData.get("role") ?? "").trim();

    const allowedRoles = ["CLIENT", "PM", "DEVELOPER", "SENIOR_ENG"];

    if (!projectId) {
      throw new Error("Project is required.");
    }

    if (!email) {
      throw new Error("Email is required.");
    }

    if (!allowedRoles.includes(roleInput)) {
      throw new Error("Invalid role selected.");
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
      throw new Error("Project not found.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await db.invite.create({
      data: {
        workspaceId: membership.workspaceId,
        projectId: project.id,
        email,
        role: roleInput as any,
        token,
        invitedById: session.user.id,
        expiresAt,
      },
    });

    await db.auditLog
      .create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: session.user.id,
          action: "member.invited",
          entityType: "Invite",
          entityId: invite.id,
          metadata: JSON.stringify({
            email,
            role: roleInput,
            projectId: project.id,
            projectName: project.name,
          }),
        },
      })
      .catch(() => null);

    redirect(`/admin/invites?projectId=${project.id}&created=${invite.token}`);
  }

  return (
    <main className="min-h-screen bg-[#111111] px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="text-sm text-white/40 transition hover:text-white"
        >
          ← Back to admin
        </Link>

        <form action={createInvite} className="mt-8">
          <input type="hidden" name="projectId" value={selectedProject.id} />

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
            <div className="border-b border-white/10 px-6 py-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                    Project Invite
                  </p>

                  <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                    {selectedProject.name}
                  </h1>

                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
                    This invite belongs only to this project. Invited people
                    will access this project through their assigned role.
                  </p>

                  <div className="mt-4 rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm text-white/45">
                    Repository:{" "}
                    <span className="text-white">
                      {selectedProject.gitHubRepo?.repoFullName ??
                        "Repository not connected"}
                    </span>
                  </div>
                </div>

                <Link
                  href="/admin"
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                >
                  Admin dashboard
                </Link>
              </div>
            </div>

            <div className="space-y-7 px-6 py-6">
              {createdInviteLink && (
                <div className="rounded-2xl border border-[#aa4825]/40 bg-[#aa4825]/10 p-5">
                  <p className="text-sm font-semibold text-[#ff8a50]">
                    Invite link created
                  </p>

                  <input
                    readOnly
                    value={createdInviteLink}
                    className="mt-4 h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none"
                  />
                </div>
              )}

              <div>
                <label className="mb-3 block text-sm font-medium text-white/75">
                  Email address
                </label>

                <input
                  name="email"
                  type="email"
                  required
                  placeholder="teammate@company.com"
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-white/75">
                  Assign role
                </label>

                <div className="space-y-3">
                  {roleOptions.map((role, index) => (
                    <label
                      key={role.value}
                      className="flex cursor-pointer items-center gap-4 rounded-xl border border-white/10 bg-[#101010] px-5 py-4 transition has-checked:border-[#aa4825] has-checked:bg-[#aa4825]/10"
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        defaultChecked={role.value === "CLIENT"}
                        className="sr-only"
                      />

                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-white/45">
                        {index + 1}
                      </span>

                      <span className="text-base font-semibold text-white">
                        {role.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-[#aa4825] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
                >
                  Create invite
                </button>
              </div>

            
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

