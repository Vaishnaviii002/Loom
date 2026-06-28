import Link from "next/link";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";

export default async function ReviewDashboardPage() {
  const { session, membership } = await requireRole(["SENIOR_ENG"]);

  const [approvedPrds, plannedTasks, inDevRequests, reviewRequests] =
    await Promise.all([
      db.featureRequest.count({
        where: {
          status: "PRD_APPROVED",
          project: {
            workspaceId: membership.workspaceId,
          },
        },
      }),
      db.task.count({
        where: {
          prd: {
            featureRequest: {
              project: {
                workspaceId: membership.workspaceId,
              },
            },
          },
        },
      }),
      db.featureRequest.count({
        where: {
          status: "IN_DEV",
          project: {
            workspaceId: membership.workspaceId,
          },
        },
      }),
      db.featureRequest.count({
        where: {
          status: "IN_REVIEW",
          project: {
            workspaceId: membership.workspaceId,
          },
        },
      }),
    ]);

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">Senior Engineer Portal</p>
            <h1 className="text-2xl font-semibold">Review Dashboard</h1>
          </div>

          <div className="text-right text-sm text-slate-400">
            <div>{session.user.email}</div>
            <div>{membership.workspace.name}</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-medium text-orange-300">
            Engineering planning
          </p>

          <h2 className="mt-2 text-4xl font-semibold">
            Turn approved PRDs into executable tasks
          </h2>

          <p className="mt-4 max-w-3xl text-slate-400">
            Senior Engineers review approved PRDs, verify acceptance criteria,
            split work into tasks, assign developers, and later approve the
            implementation after AI review and QA validation.
          </p>

          <div className="mt-6">
            <Link
              href="/review/planning"
              className="inline-flex rounded-xl bg-orange-500 px-5 py-3 font-medium text-black transition hover:bg-orange-400"
            >
              Open Planning Queue
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Approved PRDs</p>
            <p className="mt-3 text-3xl font-semibold">{approvedPrds}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Planned tasks</p>
            <p className="mt-3 text-3xl font-semibold">{plannedTasks}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">In development</p>
            <p className="mt-3 text-3xl font-semibold">{inDevRequests}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">In review</p>
            <p className="mt-3 text-3xl font-semibold">{reviewRequests}</p>
          </div>
        </section>
      </div>
    </main>
  );
}