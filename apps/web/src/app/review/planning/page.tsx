import Link from "next/link";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";

type PlanningQueueItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  project: {
    name: string;
  };
  prd?: {
    id: string;
    acceptanceCriteria: {
      id: string;
    }[];
    tasks: {
      id: string;
    }[];
  } | null;
};

export default async function PlanningQueuePage() {
  const { membership } = await requireRole(["SENIOR_ENG"]);

  const requestsRaw = await db.featureRequest.findMany({
    where: {
      status: "PRD_APPROVED",
      project: {
        workspaceId: membership.workspaceId,
      },
    },
    include: {
      project: true,
      prd: {
        include: {
          acceptanceCriteria: true,
          tasks: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const requests = requestsRaw as PlanningQueueItem[];

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">Senior Engineer Portal</p>
            <h1 className="text-2xl font-semibold">Planning Queue</h1>
          </div>

          <Link
            href="/review"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {requests.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
            <h2 className="text-3xl font-semibold">
              No approved PRDs waiting
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Approved PRDs will appear here after the Product Manager approves
              them.
            </p>
          </section>
        ) : (
          <section className="grid gap-5">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/review/planning/${request.id}`}
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

                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                        PRD approved
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Project: {request.project.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-slate-500">Criteria</p>
                      <p className="mt-1 font-semibold text-orange-300">
                        {request.prd?.acceptanceCriteria.length ?? 0}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-slate-500">Tasks</p>
                      <p className="mt-1 font-semibold text-orange-300">
                        {request.prd?.tasks.length ?? 0}
                      </p>
                    </div>
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