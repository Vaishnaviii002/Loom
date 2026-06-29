import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    projectId?: string;
  }>;
};

export default async function ProductManagerPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session.user.email) {
    redirect("/auth/sign-in");
  }

  const params = await searchParams;
  const requestedProjectId = String(params.projectId ?? "").trim();

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/auth/sign-in");
  }

  const isPm = membership.role === "PM";
  const isAdmin = membership.role === "ADMIN";

  if (!isPm && !isAdmin) {
    redirect("/auth/redirect");
  }

  let projectId = requestedProjectId;

  if (isPm && !projectId) {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email: session.user.email,
        role: "PM" as any,
        status: "ACCEPTED" as any,
        projectId: {
          not: null,
        },
      },
      orderBy: {
        acceptedAt: "desc",
      },
      select: {
        projectId: true,
      },
    });

    projectId = acceptedInvite?.projectId ?? "";
  }

  if (!projectId) {
    return (
      <main className="min-h-screen bg-[#111111] px-10 py-10 text-white">
        <section className="rounded-3xl border border-white/10 bg-[#171717] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            Product Manager
          </p>

          <h1 className="mt-4 text-3xl font-semibold">No project assigned</h1>

          <p className="mt-3 text-sm leading-7 text-white/45">
            This PM account is active, but no project access was found yet.
            Admin must invite this PM to a specific project.
          </p>
        </section>
      </main>
    );
  }

  if (isPm) {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email: session.user.email,
        role: "PM" as any,
        status: "ACCEPTED" as any,
        projectId,
      },
      select: {
        id: true,
      },
    });

    if (!acceptedInvite) {
      redirect("/auth/redirect");
    }
  }

  const project = await db.project.findFirst({
    where: isAdmin
      ? {
          id: projectId,
          workspaceId: membership.workspaceId,
        }
      : {
          id: projectId,
        },
    include: {
      gitHubRepo: true,
    },
  });

  if (!project) {
    redirect("/auth/redirect");
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div className="grid min-h-screen lg:grid-cols-[20%_80%]">
        <aside className="border-r border-white/10 bg-[#0f0f0f] px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            Loom
          </p>

          <h2 className="mt-8 text-lg font-semibold">PM Portal</h2>

          <div className="mt-8 rounded-2xl border border-[#aa4825]/40 bg-[#aa4825]/10 p-4">
            <p className="text-sm font-semibold text-[#ff8a50]">
              {project.name}
            </p>

            <p className="mt-2 text-xs text-white/40">
              {project.gitHubRepo?.repoFullName ?? "Repository not connected"}
            </p>
          </div>

          <div className="mt-8 space-y-2">
            <button className="w-full rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-medium text-white">
              Dashboard
            </button>

            <button className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-white/45">
              Requests
            </button>

            <button className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-white/45">
              PRDs
            </button>
          </div>
        </aside>

        <section className="px-10 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            Product Manager Setup
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            PM dashboard connected
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            This PM account is connected to the assigned project. Full PM
            request review, PRD creation, approval, and product workflow will be
            built in the next phase.
          </p>

          <section className="mt-8 rounded-3xl border border-white/10 bg-[#171717] p-7">
            <h2 className="text-2xl font-semibold">{project.name}</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <InfoItem
                label="Project ID"
                value={project.id}
              />

              <InfoItem
                label="Repository"
                value={project.gitHubRepo?.repoFullName ?? "Not connected"}
              />

              <InfoItem
                label="Default branch"
                value={project.gitHubRepo?.defaultBranch ?? "Not detected"}
              />

              <InfoItem
                label="Access mode"
                value={isAdmin ? "Admin preview" : "Product Manager"}
              />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>

      <p className="mt-3 text-sm leading-6 text-white/70">{value}</p>
    </div>
  );
}