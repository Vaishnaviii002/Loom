import Link from "next/link";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";

type AdminProjectListItem = Awaited<
  ReturnType<typeof db.project.findMany>
>[number];

export default async function AdminProjectsPage() {
  const { membership } = await requireRole(["ADMIN"]);

  const projects = await db.project.findMany({
    where: {
      workspaceId: membership.workspaceId,
    },
    include: {
      gitHubRepo: true,
      featureRequests: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">ShipFlow AI</p>
            <h1 className="text-2xl font-semibold">Projects</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
            >
              Dashboard
            </Link>

            <Link
              href="/admin/projects/new"
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-black hover:bg-orange-400"
            >
              New Project
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-orange-300">
                Workspace projects
              </p>

              <h2 className="mt-2 text-4xl font-semibold">
                {membership.workspace.name}
              </h2>

              <p className="mt-3 max-w-3xl text-slate-400">
                Create existing software projects with connected GitHub repos,
                or new product request projects where repository connection can
                happen later.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-right">
              <p className="text-sm text-slate-400">Total projects</p>
              <p className="mt-2 text-3xl font-semibold">{projects.length}</p>
            </div>
          </div>
        </section>

        {projects.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
            <h3 className="text-2xl font-semibold">No projects yet</h3>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Start by creating a project. For existing products, GitHub repo
              connection comes later. For new product requests, no repo is
              needed now.
            </p>

            <Link
              href="/admin/projects/new"
              className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-medium text-black hover:bg-orange-400"
            >
              Create first project
            </Link>
          </section>
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2">
            {projects.map((project: AdminProjectListItem) => (
              <Link
                key={project.id}
                href={`/admin/projects/${project.id}`}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-orange-500/40 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold">
                        {project.name}
                      </h3>

                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                        {project.projectType === "EXISTING"
                          ? "Existing Product"
                          : "New Product"}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                      {project.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-slate-500">Requests</p>
                    <p className="mt-2 text-lg font-semibold">
                      {project.featureRequests.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-slate-500">Repository</p>
                    <p className="mt-2 text-lg font-semibold">
                      {project.gitHubRepo ? "Connected" : "Not set"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-slate-500">Type</p>
                    <p className="mt-2 text-lg font-semibold">
                      {project.projectType === "EXISTING" ? "Existing" : "New"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}