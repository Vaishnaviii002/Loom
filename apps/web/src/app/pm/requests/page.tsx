import Link from "next/link";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";

type PmRequestListItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  rawDescription: string;
  project: {
    name: string;
  };
  prd?: {
    id: string;
  } | null;
};

export default async function PMRequestsPage() {
  const { membership } = await requireRole(["PM"]);

  const requestsRaw = await db.featureRequest.findMany({
    where: {
      project: {
        workspaceId: membership.workspaceId,
      },
    },
    include: {
      project: true,
      prd: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const requests = requestsRaw as PmRequestListItem[];

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">Product Manager Portal</p>
            <h1 className="text-2xl font-semibold">Request Queue</h1>
          </div>

          <Link
            href="/pm"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {requests.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
            <h2 className="text-3xl font-semibold">No requests yet</h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Client requests will appear here after they are submitted from the
              customer portal.
            </p>
          </section>
        ) : (
          <section className="grid gap-5">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/pm/requests/${request.id}`}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-orange-500/40 hover:bg-white/[0.06]"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold">
                        {request.title}
                      </h2>

                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                        {request.type}
                      </span>

                      {request.prd && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                          PRD created
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Project: {request.project.name}
                    </p>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                      {request.rawDescription}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                    <p className="text-slate-500">Status</p>
                    <p className="mt-1 font-semibold text-orange-300">
                      {request.status}
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