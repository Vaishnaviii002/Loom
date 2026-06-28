import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { inngest } from "@shipflow/inngest";
import { createTRPCRouter, protectedProcedure } from "../trpc";

async function getSeniorEngineerMembership(ctx: any) {
  const membership = await ctx.db.membership.findFirst({
    where: {
      userId: ctx.session.user.id,
      role: "SENIOR_ENG",
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
      message: "Only Senior Engineers can access task planning.",
    });
  }

  return membership;
}

export const seniorEngineerRouter = createTRPCRouter({
  planningQueue: protectedProcedure.query(async ({ ctx }) => {
    const membership = await getSeniorEngineerMembership(ctx);

    return ctx.db.featureRequest.findMany({
      where: {
        status: {
          in: ["PRD_APPROVED", "PLANNING"],
        },
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
            tasks: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }),

  getPlanningRequestById: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const membership = await getSeniorEngineerMembership(ctx);

      const request = await ctx.db.featureRequest.findFirst({
        where: {
          id: input.id,
          project: {
            workspaceId: membership.workspaceId,
          },
        },
        include: {
          project: true,
          conversationMessages: {
            orderBy: {
              createdAt: "asc",
            },
          },
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

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Planning request not found.",
        });
      }

      if (!request.prd || !request.prd.approvedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "PRD is not approved yet.",
        });
      }

      return request;
    }),

  developerOptions: protectedProcedure.query(async ({ ctx }) => {
    const membership = await getSeniorEngineerMembership(ctx);

    return ctx.db.membership.findMany({
      where: {
        workspaceId: membership.workspaceId,
        role: "DEVELOPER",
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }),

  generateTasks: protectedProcedure
    .input(
      z.object({
        featureRequestId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await getSeniorEngineerMembership(ctx);

      const request = await ctx.db.featureRequest.findFirst({
        where: {
          id: input.featureRequestId,
          project: {
            workspaceId: membership.workspaceId,
          },
        },
        include: {
          prd: {
            include: {
              tasks: true,
            },
          },
        },
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found.",
        });
      }

      if (!request.prd || !request.prd.approvedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "PRD must be approved before task generation.",
        });
      }

      if (request.prd.tasks.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Tasks are already generated for this PRD.",
        });
      }

      await inngest.send({
        name: "ai/tasks.generate",
        data: {
          featureRequestId: request.id,
          requestedById: ctx.session.user.id,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "ai.tasks.requested",
          entityType: "FeatureRequest",
          entityId: request.id,
          metadata: JSON.stringify({
            prdId: request.prd.id,
          }),
        },
      });

      return {
        ok: true,
        featureRequestId: request.id,
      };
    }),

  assignTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string().min(1),
        developerId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await getSeniorEngineerMembership(ctx);

      const developerMembership = await ctx.db.membership.findFirst({
        where: {
          userId: input.developerId,
          workspaceId: membership.workspaceId,
          role: "DEVELOPER",
        },
      });

      if (!developerMembership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selected user is not a developer in this workspace.",
        });
      }

      const task = await ctx.db.task.findFirst({
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
          assignedToId: input.developerId,
          status: "ASSIGNED",
        },
      });

      await ctx.db.featureRequest.update({
        where: {
          id: task.prd.featureRequestId,
        },
        data: {
          status: "IN_DEV",
        },
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "task.assigned",
          entityType: "Task",
          entityId: task.id,
          metadata: JSON.stringify({
            developerId: input.developerId,
            featureRequestId: task.prd.featureRequestId,
          }),
        },
      });

      return updatedTask;
    }),
});