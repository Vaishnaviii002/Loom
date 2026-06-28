import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const requestTypeSchema = z.enum([
  "BUG",
  "CRITICAL_BUG",
  "FEATURE",
  "IMPROVEMENT",
  "NEW_PRODUCT",
  "OTHER",
]);

async function getClientMembership(ctx: any) {
  const membership = await ctx.db.membership.findFirst({
    where: {
      userId: ctx.session.user.id,
      role: "CLIENT",
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
      message: "Only clients can access the customer portal.",
    });
  }

  return membership;
}

export const featureRequestRouter = createTRPCRouter({
  getClientProjects: protectedProcedure.query(async ({ ctx }) => {
    await getClientMembership(ctx);

    const access = await ctx.db.clientProjectAccess.findMany({
      where: {
        clientId: ctx.session.user.id,
      },
      include: {
        project: {
          include: {
            gitHubRepo: true,
            featureRequests: {
              where: {
                clientId: ctx.session.user.id,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    return access.map((item: any) => item.project);
  }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    await getClientMembership(ctx);

    return ctx.db.featureRequest.findMany({
      where: {
        clientId: ctx.session.user.id,
      },
      include: {
        project: true,
        conversationMessages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, "Project is required"),
        type: requestTypeSchema,
        title: z.string().min(3, "Title is required").max(100),
        rawDescription: z
          .string()
          .min(10, "Description must explain the request")
          .max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await getClientMembership(ctx);

      const projectAccess = await ctx.db.clientProjectAccess.findUnique({
        where: {
          clientId_projectId: {
            clientId: ctx.session.user.id,
            projectId: input.projectId,
          },
        },
        include: {
          project: true,
        },
      });

      if (!projectAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        });
      }

      if (
        input.type === "NEW_PRODUCT" &&
        projectAccess.project.projectType !== "NEW"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "New product requests should be raised inside a new product project.",
        });
      }

      const request = await ctx.db.featureRequest.create({
        data: {
          projectId: input.projectId,
          clientId: ctx.session.user.id,
          type: input.type,
          title: input.title,
          rawDescription: input.rawDescription,
          status: "SUBMITTED",
          conversationMessages: {
            create: {
              role: "USER",
              content: input.rawDescription,
            },
          },
        },
        include: {
          project: true,
          conversationMessages: true,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "feature_request.created",
          entityType: "FeatureRequest",
          entityId: request.id,
          metadata: JSON.stringify({
            projectId: input.projectId,
            type: input.type,
            title: input.title,
          }),
        },
      });

      return request;
    }),

  getMineById: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      await getClientMembership(ctx);

      const request = await ctx.db.featureRequest.findFirst({
        where: {
          id: input.id,
          clientId: ctx.session.user.id,
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

      return request;
    }),
});