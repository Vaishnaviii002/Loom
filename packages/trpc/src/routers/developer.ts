import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

async function getDeveloperMembership(ctx: any) {
  const membership = await ctx.db.membership.findFirst({
    where: {
      userId: ctx.session.user.id,
      role: "DEVELOPER",
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
      code: "FORBIDDEN",
      message: "Only developers can access assigned tasks.",
    });
  }

  return membership;
}

export const developerRouter = createTRPCRouter({
  assignedTasks: protectedProcedure.query(async ({ ctx }) => {
    const membership = await getDeveloperMembership(ctx);

    return ctx.db.task.findMany({
      where: {
        assignedToId: ctx.session.user.id,
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
            acceptanceCriteria: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  getTaskById: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const membership = await getDeveloperMembership(ctx);

      const task = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          assignedToId: ctx.session.user.id,
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
                  conversationMessages: {
                    orderBy: {
                      createdAt: "asc",
                    },
                  },
                },
              },
              acceptanceCriteria: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
          assignedTo: true,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found.",
        });
      }

      return task;
    }),

  updateTaskStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.string().min(1),
        status: z.enum(["ASSIGNED", "IN_PROGRESS", "DONE", "BLOCKED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await getDeveloperMembership(ctx);

      const task = await ctx.db.task.findFirst({
        where: {
          id: input.taskId,
          assignedToId: ctx.session.user.id,
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
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found.",
        });
      }

      const updatedTask = await ctx.db.task.update({
        where: {
          id: task.id,
        },
        data: {
          status: input.status,
        },
      });

      if (input.status === "IN_PROGRESS") {
        await ctx.db.featureRequest.update({
          where: {
            id: task.prd.featureRequestId,
          },
          data: {
            status: "IN_DEV",
          },
        });
      }

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "task.status_updated",
          entityType: "Task",
          entityId: task.id,
          metadata: JSON.stringify({
            oldStatus: task.status,
            newStatus: input.status,
            featureRequestId: task.prd.featureRequestId,
          }),
        },
      });

      return updatedTask;
    }),
});