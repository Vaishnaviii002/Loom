import Link from "next/link";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";

type LatestDeveloperTask = {
  id: string;
  title: string;
  priority: string;
  status: string;
  prd: {
    featureRequest: {
      project: {
        name: string;
      };
    };
  };
};

export default async function DevDashboardPage() {
  const { session, membership } = await requireRole(["DEVELOPER"]);

  const [assignedTasks, inProgressTasks, doneTasks, blockedTasks] =
    await Promise.all([
      db.task.count({
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
      }),
      db.task.count({
        where: {
          assignedToId: session.user.id,
          status: "IN_PROGRESS",
          prd: {
            featureRequest: {
              project: {
                workspaceId: membership.workspaceId,
              },
            },
          },
        },
      }),
      db.task.count({
        where: {
          assignedToId: session.user.id,
          status: "DONE",
          prd: {
            featureRequest: {
              project: {
                workspaceId: membership.workspaceId,
              },
            },
          },
        },
      }),
      db.task.count({
        where: {
          assignedToId: session.user.id,
          status: "BLOCKED",
          prd: {
            featureRequest: {
              project: {
                workspaceId: membership.workspaceId,
              },
            },
          },
        },
      }),
    ]);

  const latestTasksRaw = await db.task.findMany({
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
    take: 5,
  });

  const latestTasks = latestTasksRaw as LatestDeveloperTask[];

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">Developer Portal</p>
            <h1 className="text-2xl font-semibold">Developer Dashboard</h1>
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
            Assigned engineering work
          </p>

          <h2 className="mt-2 text-4xl font-semibold">
            Build approved product requirements
          </h2>

          <p className="mt-4 max-w-3xl text-slate-400">
            Developers receive tasks created from approved PRDs. Each task
            includes PRD context, acceptance criteria, project context, and
            implementation guidance. GitHub PR connection comes next.
          </p>

          <div className="mt-6">
            <Link
              href="/dev/tasks"
              className="inline-flex rounded-xl bg-orange-500 px-5 py-3 font-medium text-black transition hover:bg-orange-400"
            >
              Open Assigned Tasks
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Assigned tasks</p>
            <p className="mt-3 text-3xl font-semibold">{assignedTasks}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">In progress</p>
            <p className="mt-3 text-3xl font-semibold">{inProgressTasks}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Done</p>
            <p className="mt-3 text-3xl font-semibold">{doneTasks}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Blocked</p>
            <p className="mt-3 text-3xl font-semibold">{blockedTasks}</p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Latest tasks</h3>

            <Link
              href="/dev/tasks"
              className="text-sm text-orange-300 hover:text-orange-200"
            >
              View all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {latestTasks.length === 0 && (
              <p className="text-sm text-slate-400">
                No tasks assigned yet. Senior Engineer will assign tasks after
                PRD approval.
              </p>
            )}

            {latestTasks.map((task: LatestDeveloperTask) => (
              <Link
                key={task.id}
                href={`/dev/tasks/${task.id}`}
                className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-orange-500/40"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {task.prd.featureRequest.project.name}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                      {task.priority}
                    </span>

                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                      {task.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}