import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import PmDashboardClient from "./pm-dashboard-client";
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    projectId?: string;
  }>;
};

type SentPrd = {
  prdId: string;
  requestId: string;
  projectId: string;
  title: string;
  content: string;
  status: string;
  sentAt: string;
};

type PmPrdState = {
  prdId: string;
  requestId: string;
  projectId: string;
  title: string;
  updatedContent: string;
  finalContent: string;
  pmNotes: string;
  status: string;
  savedAt?: string;
  finalizedAt?: string;
};

function parseMetadata(metadata: unknown) {
  try {
    if (typeof metadata === "string") {
      return JSON.parse(metadata);
    }

    return JSON.parse(JSON.stringify(metadata ?? {}));
  } catch {
    return null;
  }
}

function parseSentPrd(metadata: unknown): SentPrd | null {
  const parsed = parseMetadata(metadata);

  if (
    !parsed?.prdId ||
    !parsed?.requestId ||
    !parsed?.projectId ||
    !parsed?.title ||
    !parsed?.content
  ) {
    return null;
  }

  return {
    prdId: String(parsed.prdId),
    requestId: String(parsed.requestId),
    projectId: String(parsed.projectId),
    title: String(parsed.title),
    content: String(parsed.content),
    status: String(parsed.status ?? "SENT_TO_PM"),
    sentAt: String(parsed.sentAt ?? ""),
  };
}

function parsePmPrdState(metadata: unknown): PmPrdState | null {
  const parsed = parseMetadata(metadata);

  if (
    !parsed?.prdId ||
    !parsed?.requestId ||
    !parsed?.projectId ||
    !parsed?.title
  ) {
    return null;
  }

  return {
    prdId: String(parsed.prdId),
    requestId: String(parsed.requestId),
    projectId: String(parsed.projectId),
    title: String(parsed.title),
    updatedContent: String(parsed.updatedContent ?? ""),
    finalContent: String(parsed.finalContent ?? ""),
    pmNotes: String(parsed.pmNotes ?? ""),
    status: String(parsed.status ?? "PM_UPDATES_SAVED"),
    savedAt: parsed.savedAt ? String(parsed.savedAt) : undefined,
    finalizedAt: parsed.finalizedAt ? String(parsed.finalizedAt) : undefined,
  };
}

export default async function ProductManagerPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session.user.email) {
    redirect("/auth/sign-in");
  }

  const userEmail = session.user.email;
  const params = await searchParams;
  const requestedProjectId = String(params.projectId ?? "").trim();

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

  const isPm = membership.role === "PM";
  const isAdmin = membership.role === "ADMIN";

  if (!isPm && !isAdmin) {
    redirect("/auth/redirect");
  }

  let projectId = requestedProjectId;

  if (isPm && !projectId) {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email: userEmail,
        role: "PM" as any,
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
            Product Manager
          </p>

          <h1 className="mt-4 text-3xl font-semibold">No project assigned</h1>

          <p className="mt-3 text-sm leading-7 text-white/45">
            This PM account is active, but no project access was found yet.
            Admin must invite this PM to a specific project.
          </p>
        </section>
      </main>
    );
  }

  if (isPm) {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email: userEmail,
        role: "PM" as any,
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

  const sentPrdLogs = await db.auditLog.findMany({
    where: {
      workspaceId: project.workspaceId,
      action: "client.prd.sent_to_pm",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });

  const pmStateLogs = await db.auditLog.findMany({
    where: {
      workspaceId: project.workspaceId,
      action: {
        in: ["pm.prd.updated", "pm.prd.finalized"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 300,
  });

  const sentPrdMap = new Map<string, SentPrd>();

  for (const log of sentPrdLogs) {
    const prd = parseSentPrd(log.metadata);

    if (!prd || prd.projectId !== projectId || sentPrdMap.has(prd.prdId)) {
      continue;
    }

    sentPrdMap.set(prd.prdId, prd);
  }

  const pmStateMap = new Map<string, PmPrdState>();

  for (const log of pmStateLogs) {
    const state = parsePmPrdState(log.metadata);

    if (!state || state.projectId !== projectId || pmStateMap.has(state.prdId)) {
      continue;
    }

    pmStateMap.set(state.prdId, state);
  }

  const prds = Array.from(sentPrdMap.values()).map((prd) => {
    const state = pmStateMap.get(prd.prdId);

    return {
      prdId: prd.prdId,
      requestId: prd.requestId,
      projectId: prd.projectId,
      title: state?.title || prd.title,
      originalContent: prd.content,
      updatedContent: state?.updatedContent || prd.content,
      finalContent: state?.finalContent || "",
      pmNotes: state?.pmNotes || "",
      status: state?.status || "NEEDS_PM_REVIEW",
      sentAt: prd.sentAt,
    };
  });

  return (
  <PmDashboardClient
    mode={isAdmin ? "ADMIN_PREVIEW" : "PM"}
    user={{
      name: String((session.user as { name?: string }).name ?? "Product Manager"),
      email: userEmail,
    }}
    project={{
      id: project.id,
      name: project.name,
      repoFullName:
        project.gitHubRepo?.repoFullName ?? "Repository not connected",
      defaultBranch: project.gitHubRepo?.defaultBranch ?? "Not detected",
    }}
    prds={prds}
  />
);
}