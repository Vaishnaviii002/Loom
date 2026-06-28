import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";

export const runtime = "nodejs";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(value);
}

export default async function AdminProjectsPage() {
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
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/auth/redirect");
  }

  const projects = await db.project.findMany({
    where: {
      workspaceId: membership.workspaceId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      gitHubRepo: {
        select: {
          repoFullName: true,
        },
      },
      _count: {
        select: {
          featureRequests: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-[#111111] px-8 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
              Loom Admin
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Projects
            </h1>

            <p className="mt-2 text-sm text-white/45">
              Every software project managed inside this workspace.
            </p>
          </div>

          <Link
            href="/admin/projects/new"
            className="rounded-xl bg-[#aa4825] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
          >
            New project
          </Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
          <div className="grid grid-cols-[1.4fr_1.6fr_0.7fr_0.9fr_0.8fr] border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-white/40">
            <p>Name</p>
            <p>Repository</p>
            <p>Requests</p>
            <p>Created</p>
            <p>Action</p>
          </div>

          {projects.length === 0 ? (
            <div className="px-5 py-8 text-sm text-white/45">
              No projects created yet.
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="grid grid-cols-[1.4fr_1.6fr_0.7fr_0.9fr_0.8fr] items-center border-b border-white/10 px-5 py-4 text-sm last:border-b-0 hover:bg-white/5"
              >
                <div>
                  <p className="font-semibold text-white">{project.name}</p>

                  {project.description ? (
                    <p className="mt-1 line-clamp-1 text-xs text-white/35">
                      {project.description}
                    </p>
                  ) : null}
                </div>

                <p className="font-mono text-white/45">
                  {project.gitHubRepo?.repoFullName ?? "Not connected"}
                </p>

                <p className="text-white/45">
                  {project._count.featureRequests}
                </p>

                <p className="text-white/45">
                  {formatDate(project.createdAt)}
                </p>

                <Link
                  href={`/admin/projects/${project.id}`}
                  className="w-fit rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                >
                  Open
                </Link>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}