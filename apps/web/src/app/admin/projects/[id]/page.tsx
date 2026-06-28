import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@shipflow/db";
import { requireRole } from "@/lib/role-routing";

export const runtime = "nodejs";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ProjectView = {
  id: string;
  name: string;
  description?: string | null;
  techStack?: string | null;
  existingFeatures?: string | null;
  businessGoals?: string | null;
  gitHubRepo?: {
    repoFullName?: string | null;
  } | null;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;

  if (!projectId) {
    notFound();
  }

  const { membership } = await requireRole(["ADMIN"]);

  if (!membership?.workspaceId) {
    redirect("/auth/redirect");
  }

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspaceId: membership.workspaceId,
    },
    include: {
      gitHubRepo: true,
    },
  });

  if (!project) {
    notFound();
  }

  const projectView = project as ProjectView;

  const [featureRequestCount, inviteCount, recentFeatureRequests] =
    await Promise.all([
      db.featureRequest.count({
        where: {
          projectId,
        },
      }),

      db.invite.count({
        where: {
          projectId,
        },
      }),

      db.featureRequest.findMany({
        where: {
          projectId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      }),
    ]);

  return (
    <main className="min-h-screen bg-[#111111] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm text-white/40 transition hover:text-white"
        >
          ← Back to admin
        </Link>

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                  Project Detail
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                  {projectView.name}
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
                  {projectView.description || "No description added."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/admin/invites?projectId=${projectView.id}`}
                  className="rounded-xl bg-[#aa4825] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
                >
                  Invite member
                </Link>

                <Link
                  href={`/admin/projects/${projectView.id}/github`}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                >
                  Manage repository
                </Link>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            <InfoRow title="Project name" value={projectView.name} />

            <InfoRow
              title="Description"
              value={projectView.description || "No description added."}
            />

            <InfoRow
              title="Tech stack"
              value={projectView.techStack || "No tech stack added."}
            />

            <InfoRow
              title="Existing features"
              value={
                projectView.existingFeatures ||
                "No existing features added."
              }
            />

            <InfoRow
              title="Business goals"
              value={projectView.businessGoals || "No business goals added."}
            />

            <InfoRow
              title="GitHub repository"
              value={
                projectView.gitHubRepo?.repoFullName ||
                "Repository not connected."
              }
            />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <SmallCard
            label="Feature requests"
            value={featureRequestCount.toString()}
            description="Client requests created for this project."
          />

          <SmallCard
            label="Invites"
            value={inviteCount.toString()}
            description="People invited to work on this project."
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold">Recent feature requests</h2>
          </div>

          {recentFeatureRequests.length === 0 ? (
            <div className="px-6 py-8 text-sm text-white/45">
              No feature requests have been raised for this project yet.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {recentFeatureRequests.map((request) => (
                <div key={request.id} className="px-6 py-4">
                  <p className="text-sm font-semibold text-white">
                    {request.title}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    {request.type} · {request.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function InfoRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="grid gap-4 px-6 py-5 md:grid-cols-[28%_72%]">
      <p className="text-sm font-medium text-white/65">{title}</p>
      <p className="whitespace-pre-wrap text-sm leading-6 text-white/45">
        {value}
      </p>
    </div>
  );
}

function SmallCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#171717] p-5">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-3 text-sm leading-6 text-white/40">{description}</p>
    </div>
  );
}