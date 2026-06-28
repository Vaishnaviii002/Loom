import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";
import TaskStatusControl from "./task-status-control";
import LinkPrControl from "./link-pr-control";

type AcceptanceCriterion = {
  id: string;
  title: string;
  description: string;
  order: number;
};

type DeveloperTaskDetail = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  prd: {
    id: string;
    problemStatement: string;
    goals: string;
    nonGoals: string;
    userStories: string;
    edgeCases: string;
    successMetrics: string;
    acceptanceCriteria: AcceptanceCriterion[];
    featureRequest: {
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
        gitHubRepo?: {
          repoFullName: string;
        } | null;
      };
      conversationMessages: {
        id: string;
        role: string;
        content: string;
      }[];
    };
  };
};

export default async function DeveloperTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership } = await requireRole(["DEVELOPER"]);

  const taskRaw = await db.task.findFirst({
    where: {
      id,
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
          acceptanceCriteria: {
            orderBy: {
              order: "asc",
            },
          },
          featureRequest: {
            include: {
              project: {
                include: {
                  gitHubRepo: true,
                },
              },
              conversationMessages: {
                orderBy: {
                  createdAt: "asc",
                },
              },
            },
          },
        },
      },
    },
  });

  if (!taskRaw) {
    notFound();
  }

  const task = taskRaw as DeveloperTaskDetail;
  const request = task.prd.featureRequest;
  const project = request.project;

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">Developer Task</p>
            <h1 className="text-2xl font-semibold">{task.title}</h1>
          </div>

          <Link
            href="/dev/tasks"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Assigned Tasks
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_420px]">
        <section className="space-y-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <div className="mb-4 flex flex-wrap gap-3">
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                {task.priority}
              </span>

              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                {task.status}
              </span>
            </div>

            <h2 className="text-4xl font-semibold">{task.title}</h2>

            <p className="mt-3 text-sm text-slate-500">
              Project: {project.name}
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-medium text-slate-300">
                Task description
              </p>

              <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-400">
                {task.description}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8">
            <p className="text-sm font-medium text-emerald-300">
              Approved PRD Context
            </p>

            <h3 className="mt-2 text-3xl font-semibold">
              Requirements for implementation
            </h3>

            <div className="mt-6 grid gap-5">
              <PrdBlock
                title="Problem statement"
                content={task.prd.problemStatement}
              />
              <PrdBlock title="Goals" content={task.prd.goals} />
              <PrdBlock title="Non-goals" content={task.prd.nonGoals} />
              <PrdBlock title="User stories" content={task.prd.userStories} />
              <PrdBlock title="Edge cases" content={task.prd.edgeCases} />
              <PrdBlock
                title="Success metrics"
                content={task.prd.successMetrics}
              />
            </div>

            <div className="mt-8">
              <h4 className="text-xl font-semibold">Acceptance criteria</h4>

              <div className="mt-4 space-y-3">
                {task.prd.acceptanceCriteria.map((criterion) => (
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
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <h3 className="text-xl font-semibold">Original client request</h3>

            <p className="mt-3 text-sm text-slate-500">
              {request.type} · {request.status}
            </p>

            <p className="mt-5 whitespace-pre-wrap leading-7 text-slate-400">
              {request.rawDescription}
            </p>
          </div>
        </section>

        <aside className="space-y-6">
          <TaskStatusControl taskId={task.id} currentStatus={task.status} />

          <LinkPrControl taskId={task.id} />


          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold">Repository</h3>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              {project.gitHubRepo
                ? project.gitHubRepo.repoFullName
                : "No GitHub repository connected yet."}
            </p>

            <div className="mt-5 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
              <p className="text-sm text-orange-200">
                GitHub PR linking will be added in the next step.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold">Project context</h3>

            <div className="mt-5 space-y-4 text-sm">
              <InfoBlock label="Description" value={project.description} />
              <InfoBlock label="Tech stack" value={project.techStack} />
              <InfoBlock
                label="Existing features"
                value={project.existingFeatures}
              />
              <InfoBlock label="Business goals" value={project.businessGoals} />
              <InfoBlock label="Target users" value={project.targetUsers} />
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