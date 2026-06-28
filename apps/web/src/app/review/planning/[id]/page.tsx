import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";
import AssignTaskControl from "./assign-task-control";
import GenerateTasksButton from "./generate-tasks-button";

type AcceptanceCriterion = {
  id: string;
  title: string;
  description: string;
  order: number;
};

type PlanningTask = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedToId?: string | null;
  assignedTo?: {
    email: string;
    name?: string | null;
  } | null;
};

type PlanningPrd = {
  id: string;
  problemStatement: string;
  goals: string;
  nonGoals: string;
  userStories: string;
  edgeCases: string;
  successMetrics: string;
  approvedAt?: Date | null;
  acceptanceCriteria: AcceptanceCriterion[];
  tasks: PlanningTask[];
};

type PlanningDetail = {
  id: string;
  title: string;
  type: string;
  status: string;
  rawDescription: string;
  project: {
    name: string;
    description: string;
    techStack?: string | null;
    existingFeatures?: string | null;
    businessGoals?: string | null;
    targetUsers?: string | null;
  };
  prd?: PlanningPrd | null;
};

export default async function PlanningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireRole(["SENIOR_ENG"]);

  const requestRaw = await db.featureRequest.findFirst({
    where: {
      id,
      project: {
        workspaceId: membership.workspaceId,
      },
    },
    include: {
      project: true,
      prd: {
        include: {
          acceptanceCriteria: {
            orderBy: {
              order: "asc",
            },
          },
          tasks: {
            include: {
              assignedTo: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  });

  if (!requestRaw || !requestRaw.prd || !requestRaw.prd.approvedAt) {
    notFound();
  }

  const request = requestRaw as PlanningDetail;
  const prd = request.prd;

  if (!prd) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">Planning Detail</p>
            <h1 className="text-2xl font-semibold">{request.title}</h1>
          </div>

          <Link
            href="/review/planning"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Planning Queue
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_420px]">
        <section className="space-y-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <div className="mb-4 flex flex-wrap gap-3">
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                {request.type}
              </span>

              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                PRD approved
              </span>

              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                {request.status}
              </span>
            </div>

            <h2 className="text-4xl font-semibold">{request.title}</h2>

            <p className="mt-3 text-sm text-slate-500">
              Project: {request.project.name}
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-medium text-slate-300">
                Original client request
              </p>

              <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-400">
                {request.rawDescription}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8">
            <p className="text-sm font-medium text-emerald-300">
              Approved PRD
            </p>

            <h3 className="mt-2 text-3xl font-semibold">
              Engineering-ready requirements
            </h3>

            <div className="mt-6 grid gap-5">
              <PrdBlock
                title="Problem statement"
                content={prd.problemStatement}
              />

              <PrdBlock title="Goals" content={prd.goals} />

              <PrdBlock title="Non-goals" content={prd.nonGoals} />

              <PrdBlock title="User stories" content={prd.userStories} />

              <PrdBlock title="Edge cases" content={prd.edgeCases} />

              <PrdBlock
                title="Success metrics"
                content={prd.successMetrics}
              />
            </div>

            <div className="mt-8">
              <h4 className="text-xl font-semibold">Acceptance criteria</h4>

              <div className="mt-4 space-y-3">
                {prd.acceptanceCriteria.map((criterion) => (
                  <div
                    key={criterion.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <p className="font-medium">
                      AC{criterion.order}: {criterion.title}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {criterion.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-xl font-semibold">Engineering tasks</h4>

              {prd.tasks.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                  No tasks generated yet. Use the Generate Tasks action from the
                  right panel.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {prd.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-5"
                    >
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-medium">{task.title}</p>

                            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                              {task.priority}
                            </span>

                            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                              {task.status}
                            </span>
                          </div>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                            {task.description}
                          </p>

                          {task.assignedTo && (
                            <p className="mt-3 text-sm text-emerald-300">
                              Assigned to:{" "}
                              {task.assignedTo.name || task.assignedTo.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <AssignTaskControl
                        taskId={task.id}
                        assignedToId={task.assignedToId}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          {prd.tasks.length === 0 && (
            <GenerateTasksButton featureRequestId={request.id} />
          )}

          <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-6">
            <h3 className="text-xl font-semibold text-orange-200">
              Next step
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Generate engineering tasks from this approved PRD, then assign
              those tasks to developers. Assigned developers will see their work
              inside the Developer Portal.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold">Project context</h3>

            <div className="mt-5 space-y-4 text-sm">
              <InfoBlock
                label="Description"
                value={request.project.description}
              />

              <InfoBlock label="Tech stack" value={request.project.techStack} />

              <InfoBlock
                label="Existing features"
                value={request.project.existingFeatures}
              />

              <InfoBlock
                label="Business goals"
                value={request.project.businessGoals}
              />

              <InfoBlock
                label="Target users"
                value={request.project.targetUsers}
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function PrdBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-sm font-medium text-slate-300">{title}</p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
        {content}
      </p>
    </div>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>

      <p className="mt-1 whitespace-pre-wrap text-slate-300">
        {value || "Not provided"}
      </p>
    </div>
  );
}