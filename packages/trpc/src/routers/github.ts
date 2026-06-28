import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  fetchPullRequestDiff,
  fetchPullRequestFromUrl,
  fetchRepository,
  parsePullRequestUrl,
  type GitHubPullRequestFile,
} from "@shipflow/github";
import { createTRPCRouter, protectedProcedure } from "../trpc";

type ShipFlowRole = "ADMIN" | "CLIENT" | "PM" | "SENIOR_ENG" | "DEVELOPER";

type MembershipContext = {
  id: string;
  userId: string;
  workspaceId: string;
  role: ShipFlowRole | string;
};

function cleanObject<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

function limitText(value: string, maxLength = 180_000) {
  if (value.length <= maxLength) return value;

  return `${value.slice(
    0,
    maxLength,
  )}\n\n[ShipFlow truncated this diff because it was too large. Original length: ${
    value.length
  } characters.]`;
}

function buildSnapshotSummary(input: {
  repoFullName: string;
  prNumber: number;
  title: string;
  state: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  files: GitHubPullRequestFile[];
}) {
  const topFiles = input.files
    .slice(0, 12)
    .map(
      (file) =>
        `- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`,
    )
    .join("\n");

  return [
    `Repository: ${input.repoFullName}`,
    `Pull Request: #${input.prNumber}`,
    `Title: ${input.title}`,
    `State: ${input.state}`,
    `Changed files: ${input.changedFiles}`,
    `Additions: ${input.additions}`,
    `Deletions: ${input.deletions}`,
    "",
    "Top changed files:",
    topFiles || "No files returned by GitHub.",
  ].join("\n");
}

async function getMembership(ctx: any): Promise<MembershipContext> {
  const membership = await ctx.db.membership.findFirst({
    where: {
      userId: ctx.session.user.id,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Membership not found. Please login again.",
    });
  }

  return membership;
}

async function requireRole(ctx: any, roles: ShipFlowRole[]) {
  const membership = await getMembership(ctx);

  if (!roles.includes(membership.role as ShipFlowRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have permission for this GitHub action. Current role: ${membership.role}`,
    });
  }

  return membership;
}

async function assertDeveloperCanAccessPullRequest(
  ctx: any,
  membership: MembershipContext,
  pullRequest: any,
) {
  if (membership.role !== "DEVELOPER") return;

  if (!pullRequest.taskId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This pull request is not linked to an assigned task.",
    });
  }

  const task = await (ctx.db.task as any).findFirst({
    where: {
      id: pullRequest.taskId,
    },
    select: {
      id: true,
      assignedToId: true,
    },
  });

  if (!task || task.assignedToId !== ctx.session.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Developers can only access PRs linked to their assigned tasks.",
    });
  }
}

export const githubRouter = createTRPCRouter({
  connectProjectRepo: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, "Project ID is required"),
        repoFullName: z.string().min(3, "Repository is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireRole(ctx, ["ADMIN", "SENIOR_ENG"]);

      const projectId = input.projectId.trim();

      const projectById = await ctx.db.project.findFirst({
        where: {
          id: projectId,
          workspaceId: membership.workspaceId,
        },
        include: {
          workspace: true,
        },
      });

      if (!projectById) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Project not found for ID: ${projectId}. Open /admin/projects, click the project again, and use that exact URL.`,
        });
      }

      const repo = await fetchRepository(input.repoFullName);

      const repoUpdateData = cleanObject({
        repoFullName: repo.repoFullName,
        owner: repo.owner,
        name: repo.name,
        defaultBranch: repo.defaultBranch ?? undefined,
      });

      const repoCreateData = cleanObject({
        projectId: projectById.id,
        repoFullName: repo.repoFullName,
        owner: repo.owner,
        name: repo.name,
        defaultBranch: repo.defaultBranch ?? undefined,
      });

      const savedRepo = await (ctx.db.gitHubRepo as any).upsert({
        where: {
          projectId: projectById.id,
        },
        update: repoUpdateData,
        create: repoCreateData,
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "github.repo.connected",
          entityType: "GitHubRepo",
          entityId: savedRepo.id,
          metadata: JSON.stringify({
            projectId: projectById.id,
            repoFullName: savedRepo.repoFullName,
          }),
        },
      });

      return savedRepo;
    }),

  linkTaskPullRequest: protectedProcedure
    .input(
      z.object({
        taskId: z.string().min(1, "Task ID is required"),
        pullRequestUrl: z.string().url("Valid GitHub PR URL is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireRole(ctx, ["DEVELOPER", "SENIOR_ENG"]);

      const task = (await ctx.db.task.findFirst({
        where: {
          id: input.taskId,
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
                  project: {
                    include: {
                      gitHubRepo: true,
                    },
                  },
                },
              },
            },
          },
        },
      })) as any;

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found.",
        });
      }

      if (
        membership.role === "DEVELOPER" &&
        task.assignedToId !== ctx.session.user.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Developers can only link PRs to their assigned tasks.",
        });
      }

      const connectedRepo = task.prd.featureRequest.project.gitHubRepo;

      if (!connectedRepo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This project does not have a connected GitHub repository.",
        });
      }

      const parsed = parsePullRequestUrl(input.pullRequestUrl);

      if (parsed.repoFullName !== connectedRepo.repoFullName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `PR must belong to connected repo ${connectedRepo.repoFullName}.`,
        });
      }

      const pr = await fetchPullRequestFromUrl(input.pullRequestUrl);

      const prUpdateData = cleanObject({
        taskId: task.id,
        title: pr.title,
        state: pr.state,
        url: pr.url,
        branch: pr.branch ?? undefined,
        baseBranch: pr.baseBranch ?? undefined,
        author: pr.author ?? undefined,
        changedFiles: pr.changedFiles,
        additions: pr.additions,
        deletions: pr.deletions,
        lastSyncedAt: new Date(),
      });

      const prCreateData = cleanObject({
        repoId: connectedRepo.id,
        taskId: task.id,
        prNumber: pr.prNumber,
        title: pr.title,
        state: pr.state,
        url: pr.url,
        branch: pr.branch ?? undefined,
        baseBranch: pr.baseBranch ?? undefined,
        author: pr.author ?? undefined,
        changedFiles: pr.changedFiles,
        additions: pr.additions,
        deletions: pr.deletions,
      });

      const savedPr = await (ctx.db.pullRequest as any).upsert({
        where: {
          repoId_prNumber: {
            repoId: connectedRepo.id,
            prNumber: pr.prNumber,
          },
        },
        update: prUpdateData,
        create: prCreateData,
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "github.pr.linked",
          entityType: "PullRequest",
          entityId: savedPr.id,
          metadata: JSON.stringify({
            taskId: task.id,
            prNumber: savedPr.prNumber,
            repoFullName: connectedRepo.repoFullName,
          }),
        },
      });

      return savedPr;
    }),

  getPullRequestDiff: protectedProcedure
    .input(
      z.object({
        pullRequestId: z.string().min(1, "Pull request ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const membership = await requireRole(ctx, [
        "ADMIN",
        "SENIOR_ENG",
        "DEVELOPER",
      ]);

      const pullRequest = await (ctx.db.pullRequest as any).findFirst({
        where: {
          id: input.pullRequestId,
          repo: {
            project: {
              workspaceId: membership.workspaceId,
            },
          },
        },
        include: {
          repo: true,
        },
      });

      if (!pullRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pull request not found.",
        });
      }

      await assertDeveloperCanAccessPullRequest(ctx, membership, pullRequest);

      const diff = await fetchPullRequestDiff({
        repoFullName: pullRequest.repo.repoFullName,
        prNumber: pullRequest.prNumber,
      });

      return {
        pullRequestId: pullRequest.id,
        repoFullName: diff.repoFullName,
        prNumber: diff.prNumber,
        title: diff.title,
        state: diff.state,
        author: diff.author ?? null,
        baseBranch: diff.baseBranch ?? null,
        headBranch: diff.headBranch ?? null,
        changedFiles: diff.changedFiles,
        additions: diff.additions,
        deletions: diff.deletions,
        htmlUrl: diff.htmlUrl,
        files: diff.files.map((file: GitHubPullRequestFile) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          hasPatch: Boolean(file.patch),
          patchPreview: file.patch ? file.patch.slice(0, 1200) : null,
        })),
        combinedPatchPreview: diff.combinedPatch.slice(0, 5000),
      };
    }),

  createPullRequestReviewSnapshot: protectedProcedure
    .input(
      z.object({
        pullRequestId: z.string().min(1, "Pull request ID is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireRole(ctx, [
        "ADMIN",
        "SENIOR_ENG",
        "DEVELOPER",
      ]);

      const pullRequest = await (ctx.db.pullRequest as any).findFirst({
        where: {
          id: input.pullRequestId,
          repo: {
            project: {
              workspaceId: membership.workspaceId,
            },
          },
        },
        include: {
          repo: true,
        },
      });

      if (!pullRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pull request not found.",
        });
      }

      await assertDeveloperCanAccessPullRequest(ctx, membership, pullRequest);

      const diff = await fetchPullRequestDiff({
        repoFullName: pullRequest.repo.repoFullName,
        prNumber: pullRequest.prNumber,
      });

      await (ctx.db.pullRequest as any).update({
        where: {
          id: pullRequest.id,
        },
        data: cleanObject({
          title: diff.title,
          state: diff.state,
          branch: diff.headBranch ?? undefined,
          baseBranch: diff.baseBranch ?? undefined,
          author: diff.author ?? undefined,
          changedFiles: diff.changedFiles,
          additions: diff.additions,
          deletions: diff.deletions,
          lastSyncedAt: new Date(),
        }),
      });

      const summary = buildSnapshotSummary({
        repoFullName: diff.repoFullName,
        prNumber: diff.prNumber,
        title: diff.title,
        state: diff.state,
        changedFiles: diff.changedFiles,
        additions: diff.additions,
        deletions: diff.deletions,
        files: diff.files,
      });

      const snapshot = await (ctx.db.reviewSnapshot as any).create({
        data: {
          pullRequestId: pullRequest.id,
          status: "SNAPSHOT_CREATED",
          summary,
          rawDiff: limitText(diff.combinedPatch),
          aiResult: null,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "github.pr.snapshot.created",
          entityType: "ReviewSnapshot",
          entityId: snapshot.id,
          metadata: JSON.stringify({
            pullRequestId: pullRequest.id,
            prNumber: diff.prNumber,
            repoFullName: diff.repoFullName,
            changedFiles: diff.changedFiles,
            additions: diff.additions,
            deletions: diff.deletions,
          }),
        },
      });

      return snapshot;
    }),

  listPullRequestReviewSnapshots: protectedProcedure
    .input(
      z.object({
        pullRequestId: z.string().min(1, "Pull request ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const membership = await requireRole(ctx, [
        "ADMIN",
        "SENIOR_ENG",
        "DEVELOPER",
      ]);

      const pullRequest = await (ctx.db.pullRequest as any).findFirst({
        where: {
          id: input.pullRequestId,
          repo: {
            project: {
              workspaceId: membership.workspaceId,
            },
          },
        },
      });

      if (!pullRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pull request not found.",
        });
      }

      await assertDeveloperCanAccessPullRequest(ctx, membership, pullRequest);

      const snapshots = await (ctx.db.reviewSnapshot as any).findMany({
        where: {
          pullRequestId: input.pullRequestId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          pullRequestId: true,
          status: true,
          summary: true,
          aiResult: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return snapshots;
    }),
});