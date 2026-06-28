import Link from "next/link";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";

export default async function PMDashboardPage() {
  const { session, membership } = await requireRole(["PM"]);

  const [totalRequests, discoveryRequests, prdDrafts, approvedPrds] =
    await Promise.all([
      db.featureRequest.count({
        where: {
          project: {
            workspaceId: membership.workspaceId,
          },
        },
      }),
      db.featureRequest.count({
        where: {
          status: "DISCOVERY",
          project: {
            workspaceId: membership.workspaceId,
          },
        },
      }),
      db.featureRequest.count({
        where: {
          status: "PRD_DRAFT",
          project: {
            workspaceId: membership.workspaceId,
          },
        },
      }),
      db.featureRequest.count({
        where: {
          status: "PRD_APPROVED",
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
            <p className="text-sm text-orange-300">Product Manager Portal</p>
            <h1 className="text-2xl font-semibold">PM Dashboard</h1>
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
            Product workflow
          </p>

          <h2 className="mt-2 text-4xl font-semibold">
            Review requests and prepare PRDs
          </h2>

          <p className="mt-4 max-w-3xl text-slate-400">
            Product Managers review client requests, use AI Discovery context,
            generate PRDs, validate acceptance criteria, and approve PRDs before
            engineering planning begins.
          </p>

          <div className="mt-6">
            <Link
              href="/pm/requests"
              className="inline-flex rounded-xl bg-orange-500 px-5 py-3 font-medium text-black transition hover:bg-orange-400"
            >
              Open Request Queue
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Total requests</p>
            <p className="mt-3 text-3xl font-semibold">{totalRequests}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Discovery</p>
            <p className="mt-3 text-3xl font-semibold">{discoveryRequests}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">PRD drafts</p>
            <p className="mt-3 text-3xl font-semibold">{prdDrafts}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Approved PRDs</p>
            <p className="mt-3 text-3xl font-semibold">{approvedPrds}</p>
          </div>
        </section>
      </div>
    </main>
  );
}