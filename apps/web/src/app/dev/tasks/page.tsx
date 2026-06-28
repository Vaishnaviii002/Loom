import Link from "next/link";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";

type DeveloperTaskListItem = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  prd: {
    featureRequest: {
      id: string;
      title: string;
      status: string;
      project: {
        name: string;
      };
    };
  };
};

export default async function DeveloperTasksPage() {
  const { session, membership } = await requireRole(["DEVELOPER"]);

  const tasksRaw = await db.task.findMany({
    where: {
      assignedToId: session.user.id,
      prd: {
        featureRequest: {
          project: {
            workspaceId: membership.workspaceId,
          },
        },
      },
    },
    include: {
      prd: {
        include: {
          featureRequest: {
            include: {
              project: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const tasks = tasksRaw as DeveloperTaskListItem[];

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">Developer Portal</p>
            <h1 className="text-2xl font-semibold">Assigned Tasks</h1>
          </div>

          <Link
            href="/dev"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {tasks.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
            <h2 className="text-3xl font-semibold">No assigned tasks yet</h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Tasks will appear here after a Senior Engineer assigns them to
              you.
            </p>
          </section>
        ) : (
          <section className="grid gap-5">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/dev/tasks/${task.id}`}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-orange-500/40 hover:bg-white/[0.06]"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold">{task.title}</h2>

                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                        {task.priority}
                      </span>

                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                        {task.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Project: {task.prd.featureRequest.project.name}
                    </p>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                      {task.description}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                    <p className="text-slate-500">Request</p>
                    <p className="mt-1 font-semibold text-orange-300">
                      {task.prd.featureRequest.status}
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