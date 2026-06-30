import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@shipflow/db";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type DevelopmentTask = {
  id?: string;
  title?: string;
  ownerRole?: string;
  summary?: string;
  workItems?: string[];
  affectedFiles?: string[];
  area?: string;
  reason?: string;
  acceptanceCriteria?: string[];
  status?: string;
};

type SentToDevelopmentMetadata = {
  prdId?: string;
  requestId?: string;
  projectId?: string;
  projectName?: string;
  repository?: string;
  title?: string;
  finalContent?: string;
  status?: string;
  tasks?: DevelopmentTask[];
  createdAt?: string;
};

type AiReviewMetadata = {
  projectId?: string;
  requestId?: string;
  prdId?: string;
  repository?: string;
  pullNumber?: number;
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  pullRequestState?: string;
  changedFiles?: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }[];
  review?: {
    status: "FIX_REQUIRED" | "AI_APPROVED";
    summary: string;
    issues: {
      severity: "BLOCKING" | "NON_BLOCKING";
      file?: string;
      issue: string;
      recommendation: string;
    }[];
  };
  status?: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
  createdAt?: string;
};

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function safeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function reviewKey({
  projectId,
  requestId,
  prdId,
}: {
  projectId?: string;
  requestId?: string;
  prdId?: string;
}) {
  return `${projectId || ""}:${requestId || ""}:${prdId || ""}`;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const projectMemberships = await db.clientProjectMember.findMany({
      where: {
        userId: session.user.id,
        role: {
          in: ["DEVELOPER", "ADMIN"],
        },
      },
      include: {
        project: {
          include: {
            gitHubRepo: true,
          },
        },
      },
    });

    const adminMemberships = await db.membership.findMany({
      where: {
        userId: session.user.id,
        role: "ADMIN",
      },
      include: {
        workspace: {
          include: {
            projects: {
              include: {
                gitHubRepo: true,
              },
            },
          },
        },
      },
    });

    const accessibleProjects = new Map<
      string,
      {
        id: string;
        name: string;
        workspaceId: string;
        repository: string;
      }
    >();

    for (const membership of projectMemberships) {
      accessibleProjects.set(membership.project.id, {
        id: membership.project.id,
        name: membership.project.name,
        workspaceId: membership.project.workspaceId,
        repository: membership.project.gitHubRepo?.repoFullName || "",
      });
    }

    for (const membership of adminMemberships) {
      for (const project of membership.workspace.projects) {
        accessibleProjects.set(project.id, {
          id: project.id,
          name: project.name,
          workspaceId: project.workspaceId,
          repository: project.gitHubRepo?.repoFullName || "",
        });
      }
    }

    const accessibleProjectIds = Array.from(accessibleProjects.keys());
    const workspaceIds = Array.from(
      new Set(
        Array.from(accessibleProjects.values()).map(
          (project) => project.workspaceId,
        ),
      ),
    );

    if (accessibleProjectIds.length === 0 || workspaceIds.length === 0) {
      return NextResponse.json({
        ok: true,
        batches: [],
      });
    }

    const sentLogs = await db.auditLog.findMany({
      where: {
        workspaceId: {
          in: workspaceIds,
        },
        action: "pm.prd.sent_to_development",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const reviewLogs = await db.auditLog.findMany({
      where: {
        workspaceId: {
          in: workspaceIds,
        },
        action: "developer.pr.ai_reviewed",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const latestReviewByKey = new Map<string, AiReviewMetadata>();

    for (const log of reviewLogs) {
      const metadata = parseJson<AiReviewMetadata>(log.metadata);

      if (!metadata) continue;

      const key = reviewKey({
        projectId: metadata.projectId,
        requestId: metadata.requestId,
        prdId: metadata.prdId,
      });

      if (!latestReviewByKey.has(key)) {
        latestReviewByKey.set(key, metadata);
      }
    }

    const batches = sentLogs
      .map((log) => {
        const metadata = parseJson<SentToDevelopmentMetadata>(log.metadata);

        if (!metadata) return null;

        const projectId = safeString(metadata.projectId);
        const requestId = safeString(metadata.requestId);
        const prdId = safeString(metadata.prdId);

        if (!projectId || !requestId) return null;
        if (!accessibleProjectIds.includes(projectId)) return null;

        const project = accessibleProjects.get(projectId);

        if (!project) return null;

        const key = reviewKey({
          projectId,
          requestId,
          prdId,
        });

        const latestReview = latestReviewByKey.get(key) || null;

        return {
          id: log.id,
          projectId,
          requestId,
          prdId,
          projectName: metadata.projectName || project.name,
          repository: metadata.repository || project.repository,
          title: metadata.title || "Development task",
          status: metadata.status || "SENT_TO_DEVELOPMENT",
          createdAt: metadata.createdAt || log.createdAt.toISOString(),
          tasks: Array.isArray(metadata.tasks) ? metadata.tasks : [],
          latestReview,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      batches,
    });
  } catch (error) {
    console.error("developer tasks load error", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load developer tasks",
      },
      {
        status: 500,
      },
    );
  }
}