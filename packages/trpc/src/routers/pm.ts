import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { inngest } from "@shipflow/inngest";
import { createTRPCRouter, protectedProcedure } from "../trpc";

async function getPmMembership(ctx: any) {
  const membership = await ctx.db.membership.findFirst({
    where: {
      userId: ctx.session.user.id,
      role: "PM",
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
      message: "Only Product Managers can access this area.",
    });
  }

  return membership;
}

export const pmRouter = createTRPCRouter({
  requestQueue: protectedProcedure.query(async ({ ctx }) => {
    const membership = await getPmMembership(ctx);

    return ctx.db.featureRequest.findMany({
      where: {
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  getRequestById: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const membership = await getPmMembership(ctx);

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

      return request;
    }),

  generatePrd: protectedProcedure
    .input(
      z.object({
        featureRequestId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await getPmMembership(ctx);

      const request = await ctx.db.featureRequest.findFirst({
        where: {
          id: input.featureRequestId,
          project: {
            workspaceId: membership.workspaceId,
          },
        },
        include: {
          prd: true,
        },
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found.",
        });
      }

      if (request.prd) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A PRD already exists for this request.",
        });
      }

      await inngest.send({
        name: "ai/prd.generate",
        data: {
          featureRequestId: request.id,
          requestedById: ctx.session.user.id,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "ai.prd.requested",
          entityType: "FeatureRequest",
          entityId: request.id,
          metadata: JSON.stringify({
            status: request.status,
          }),
        },
      });

      return {
        ok: true,
        featureRequestId: request.id,
      };
    }),

  approvePrd: protectedProcedure
    .input(
      z.object({
        prdId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await getPmMembership(ctx);

      const prd = await ctx.db.prd.findFirst({
        where: {
          id: input.prdId,
          featureRequest: {
            project: {
              workspaceId: membership.workspaceId,
            },
          },
        },
        include: {
          featureRequest: true,
        },
      });

      if (!prd) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "PRD not found.",
        });
      }

      const updatedPrd = await ctx.db.prd.update({
        where: {
          id: prd.id,
        },
        data: {
          approvedByPmId: ctx.session.user.id,
          approvedAt: new Date(),
        },
      });

      await ctx.db.featureRequest.update({
        where: {
          id: prd.featureRequestId,
        },
        data: {
          status: "PRD_APPROVED",
        },
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "prd.approved",
          entityType: "Prd",
          entityId: prd.id,
          metadata: JSON.stringify({
            featureRequestId: prd.featureRequestId,
          }),
        },
      });

      return updatedPrd;
    }),
});