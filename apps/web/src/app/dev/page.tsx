import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    projectId?: string;
  }>;
};

type DevelopmentTask = {
  id: string;
  title: string;
  ownerRole: string;
  area: string;
  reason: string;
  acceptanceCriteria: string[];
  status: string;
};

type DevelopmentBatch = {
  prdId: string;
  requestId: string;
  projectId: string;
  projectName: string;
  repository: string;
  title: string;
  finalContent: string;
  status: string;
  tasks: DevelopmentTask[];
  createdAt: string;
};

function parseMetadata(metadata: unknown): DevelopmentBatch | null {
  try {
    const parsed =
      typeof metadata === "string"
        ? JSON.parse(metadata)
        : JSON.parse(JSON.stringify(metadata ?? {}));

    if (!parsed?.prdId || !parsed?.projectId || !Array.isArray(parsed?.tasks)) {
      return null;
    }

    return parsed as DevelopmentBatch;
  } catch {
    return null;
  }
}

export default async function DeveloperPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session.user.email) {
    redirect("/auth/sign-in");
  }

  const params = await searchParams;
  let projectId = String(params.projectId ?? "").trim();

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/auth/sign-in");
  }

  const isDeveloper = membership.role === "DEVELOPER";
  const isAdmin = membership.role === "ADMIN";

  if (!isDeveloper && !isAdmin) {
    redirect("/auth/redirect");
  }

  if (isDeveloper && !projectId) {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email: session.user.email,
        role: "DEVELOPER" as any,
        status: "ACCEPTED" as any,
        projectId: {
          not: null,
        },
      },
      orderBy: {
        acceptedAt: "desc",
      },
      select: {
        projectId: true,
      },
    });

    projectId = acceptedInvite?.projectId ?? "";
  }

  if (!projectId) {
    return (
      <main className="min-h-screen bg-[#111111] px-10 py-10 text-white">
        <section className="rounded-3xl border border-white/10 bg-[#171717] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            Developer Portal
          </p>

          <h1 className="mt-4 text-3xl font-semibold">No project assigned</h1>

          <p className="mt-3 text-sm leading-7 text-white/45">
            This developer account is active, but no project access was found.
          </p>
        </section>
      </main>
    );
  }

  if (isDeveloper) {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email: session.user.email,
        role: "DEVELOPER" as any,
        status: "ACCEPTED" as any,
        projectId,
      },
      select: {
        id: true,
      },
    });

    if (!acceptedInvite) {
      redirect("/auth/redirect");
    }
  }

  const project = await db.project.findFirst({
    where: isAdmin
      ? {
          id: projectId,
          workspaceId: membership.workspaceId,
        }
      : {
          id: projectId,
        },
    include: {
      gitHubRepo: true,
    },
  });

  if (!project) {
    redirect("/auth/redirect");
  }

  const logs = await db.auditLog.findMany({
    where: {
      workspaceId: project.workspaceId,
      action: "pm.prd.sent_to_development",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });

  const batches = logs
    .map((log) => parseMetadata(log.metadata))
    .filter(
      (batch): batch is DevelopmentBatch =>
        Boolean(batch && batch.projectId === projectId),
    );

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div className="grid min-h-screen lg:grid-cols-[20%_80%]">
        <aside className="border-r border-white/10 bg-[#0f0f0f] px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            Loom
          </p>

          <h2 className="mt-10 text-2xl font-semibold">Developer Portal</h2>

          <div className="mt-8 rounded-2xl border border-[#aa4825]/40 bg-[#aa4825]/10 p-5">
            <p className="text-base font-semibold text-[#ff8a50]">
              {project.name}
            </p>

            <p className="mt-3 text-sm text-white/45">
              {project.gitHubRepo?.repoFullName ?? "Repository not connected"}
            </p>
          </div>

          <nav className="mt-10">
            <button className="w-full rounded-xl bg-white/10 px-5 py-4 text-left text-sm font-semibold text-white">
              Assigned Tasks
            </button>
          </nav>
        </aside>

        <section className="px-10 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            Assigned development work
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Developer tasks
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            These tasks were created from PM-approved PRDs for this project.
          </p>

          <div className="mt-10 space-y-6">
            {batches.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
                No development tasks have been assigned yet.
              </div>
            ) : (
              batches.map((batch) => (
                <section
                  key={batch.prdId}
                  className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                        PM-approved PRD
                      </p>

                      <h2 className="mt-4 text-3xl font-semibold text-white">
                        {batch.title}
                      </h2>

                      <p className="mt-2 text-sm text-white/35">
                        Status: {batch.status}
                      </p>
                    </div>

                    <Badge label={`${batch.tasks.length} tasks`} />
                  </div>

                  <div className="mt-7 space-y-4">
                    {batch.tasks.map((task) => (
                      <article
                        key={task.id}
                        className="rounded-2xl border border-white/10 bg-[#101010] p-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-xl font-semibold text-white">
                              {task.title}
                            </h3>

                            <p className="mt-2 text-sm text-[#ff9c73]">
                              Assigned to: {task.ownerRole}
                            </p>
                          </div>

                          <Badge label={task.status} />
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr]">
                          <p className="text-sm font-semibold text-white/75">
                            Area
                          </p>

                          <p className="text-sm leading-7 text-white/50">
                            {task.area}
                          </p>

                          <p className="text-sm font-semibold text-white/75">
                            Reason
                          </p>

                          <p className="text-sm leading-7 text-white/50">
                            {task.reason}
                          </p>

                          <p className="text-sm font-semibold text-white/75">
                            Acceptance criteria
                          </p>

                          <ul className="space-y-2 text-sm leading-7 text-white/50">
                            {task.acceptanceCriteria.map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#aa4825]/40 bg-[#aa4825]/10 px-3 py-1 text-xs text-[#ff8a50]">
      {label}
    </span>
  );
}