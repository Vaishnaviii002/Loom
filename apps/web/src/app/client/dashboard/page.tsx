import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";

export const runtime = "nodejs";

type ClientDashboardPageProps = {
  searchParams: Promise<{
    projectId?: string;
    preview?: string;
  }>;
};

async function fetchGitHubRepository(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");

  if (!owner || !repo) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          ...(process.env.GITHUB_TOKEN
            ? {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              }
            : {}),
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      description: String(data.description ?? ""),
      defaultBranch: String(data.default_branch ?? ""),
      language: String(data.language ?? ""),
      visibility: String(data.visibility ?? ""),
      url: String(data.html_url ?? `https://github.com/${repoFullName}`),
      updatedAt: String(data.updated_at ?? ""),
    };
  } catch {
    return null;
  }
}

export default async function ClientDashboardPage({
  searchParams,
}: ClientDashboardPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const resolvedSearchParams = await searchParams;
  const selectedProjectId = resolvedSearchParams.projectId;

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/auth/redirect");
  }

  const isAdmin = membership.role === "ADMIN";
  const isClient = membership.role === "CLIENT";

  if (!isAdmin && !isClient) {
    redirect("/auth/redirect");
  }

  let accessibleProjects: any[] = [];

  if (isAdmin) {
    const adminProjects = await db.project.findMany({
      where: {
        workspaceId: membership.workspaceId,
      },
      include: {
        gitHubRepo: true,
        featureRequests: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    accessibleProjects = adminProjects.map((project: any) => ({
      id: project.id,
      projectId: project.id,
      project,
    }));
  }

  if (isClient) {
    accessibleProjects = await db.clientProjectAccess.findMany({
      where: {
        clientId: session.user.id,
      },
      include: {
        project: {
          include: {
            gitHubRepo: true,
            featureRequests: {
              where: {
                clientId: session.user.id,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
      orderBy: {
        project: {
          createdAt: "desc",
        },
      },
    });
  }

  if (accessibleProjects.length === 0) {
    return (
      <main className="min-h-screen bg-[#111111] px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            Client Portal
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            No assigned project
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            No client project access is available for this account.
          </p>
        </div>
      </main>
    );
  }

  const selectedAccess = selectedProjectId
    ? accessibleProjects.find((access) => access.projectId === selectedProjectId)
    : accessibleProjects[0];

  if (!selectedAccess) {
    notFound();
  }

  if (!selectedProjectId) {
    redirect(`/client/dashboard?projectId=${selectedAccess.projectId}`);
  }

  const project = selectedAccess.project;

  const repoMeta = project.gitHubRepo?.repoFullName
    ? await fetchGitHubRepository(project.gitHubRepo.repoFullName)
    : null;

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div className="grid min-h-screen lg:grid-cols-[20%_80%]">
        <aside className="flex min-h-screen flex-col border-r border-white/10 bg-[#0f0f0f]">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#aa4825] text-sm font-black text-white">
                S
              </div>

              <div>
                <p className="text-sm font-semibold">ShipFlow AI</p>
                <p className="text-xs text-white/40">
                  {isAdmin ? "Admin Client Preview" : "Client Portal"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
              {isAdmin ? "Workspace projects" : "Assigned projects"}
            </p>

            <div className="space-y-2">
              {accessibleProjects.map((access) => {
                const isActive = access.projectId === project.id;

                return (
                  <Link
                    key={access.projectId}
                    href={`/client/dashboard?projectId=${access.projectId}${
                      isAdmin ? "&preview=admin" : ""
                    }`}
                    className={`block rounded-2xl border p-4 transition ${
                      isActive
                        ? "border-[#aa4825]/60 bg-[#aa4825]/10"
                        : "border-white/10 bg-white/5 hover:border-[#aa4825]/40"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        isActive ? "text-[#ff8a50]" : "text-white"
                      }`}
                    >
                      {access.project.name}
                    </p>

                    <p className="mt-1 line-clamp-1 text-xs text-white/40">
                      {access.project.gitHubRepo?.repoFullName ??
                        "Repository not connected"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="truncate text-sm font-medium">
                {session.user.name ?? "User"}
              </p>

              <p className="mt-1 truncate text-xs text-white/40">
                {session.user.email}
              </p>

              <p className="mt-2 text-xs text-[#aa4825]">
                {isAdmin ? "ADMIN PREVIEW" : "CLIENT"}
              </p>
            </div>
          </div>
        </aside>

        <section className="min-h-screen overflow-y-auto bg-[#111111]">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#111111]/95 px-8 py-5 backdrop-blur">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                  {isAdmin ? "Admin Preview" : "Client Project"}
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  {project.name}
                </h1>

                <p className="mt-1 text-sm text-white/45">
                  {isAdmin
                    ? "You are viewing this client project as an admin. This does not log you in as the client."
                    : "Authenticated client access for this assigned project only."}
                </p>
              </div>

              {isAdmin ? (
                <Link
                  href="/admin"
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                >
                  Back to admin
                </Link>
              ) : (
                <Link
                  href={`/client/requests/new?projectId=${project.id}`}
                  className="rounded-xl bg-[#aa4825] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
                >
                  Raise request
                </Link>
              )}
            </div>
          </header>

          {isAdmin && (
            <div className="border-b border-[#aa4825]/30 bg-[#aa4825]/10 px-8 py-3 text-sm text-[#ffb08a]">
              Admin preview mode is active. Client authentication and client
              password are not being used.
            </div>
          )}

          <div className="space-y-8 px-8 py-8">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-xl font-semibold">Project details</h2>
              </div>

              <div className="divide-y divide-white/10">
                <InfoRow
                  title="Description"
                  value={project.description || "No description added."}
                />

                <InfoRow
                  title="Tech stack"
                  value={project.techStack || "No tech stack added."}
                />

                <InfoRow
                  title="GitHub repository"
                  value={
                    project.gitHubRepo?.repoFullName ||
                    "Repository not connected."
                  }
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-xl font-semibold">Repository context</h2>
              </div>

              {!project.gitHubRepo?.repoFullName ? (
                <div className="px-6 py-8 text-sm text-white/45">
                  Repository is not connected yet.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  <InfoRow
                    title="Repository"
                    value={project.gitHubRepo.repoFullName}
                  />

                  <InfoRow
                    title="GitHub description"
                    value={
                      repoMeta?.description || "No GitHub description found."
                    }
                  />

                  <InfoRow
                    title="Default branch"
                    value={repoMeta?.defaultBranch || "Not detected."}
                  />

                  <InfoRow
                    title="Main language"
                    value={repoMeta?.language || "Not detected."}
                  />

                  <div className="px-6 py-5">
                    <a
                      href={
                        repoMeta?.url ||
                        `https://github.com/${project.gitHubRepo.repoFullName}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                    >
                      Open GitHub repository
                    </a>
                  </div>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <h2 className="text-xl font-semibold">
                  {isAdmin ? "Client requests preview" : "Your requests"}
                </h2>

                {!isAdmin && (
                  <Link
                    href={`/client/requests/new?projectId=${project.id}`}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                  >
                    New request
                  </Link>
                )}
              </div>

              {project.featureRequests.length === 0 ? (
                <div className="px-6 py-8 text-sm text-white/45">
                  No requests raised yet.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {project.featureRequests.map((request: any) => (
                    <div key={request.id} className="px-6 py-5">
                      <p className="text-sm font-semibold text-white">
                        {request.title}
                      </p>

                      <p className="mt-1 text-xs text-white/40">
                        {request.type} · {request.status}
                      </p>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/45">
                        {request.rawDescription}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="grid gap-5 px-6 py-5 md:grid-cols-[28%_72%]">
      <p className="text-sm font-medium text-white/65">{title}</p>
      <p className="whitespace-pre-wrap text-sm leading-6 text-white/45">
        {value}
      </p>
    </div>
  );
}