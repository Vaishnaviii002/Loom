import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

async function getAdminMembership(ctx: {
  db: any;
  session: {
    user: {
      id: string;
    };
  };
}) {
  const membership = await ctx.db.membership.findFirst({
    where: {
      userId: ctx.session.user.id,
      role: "ADMIN",
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
      message: "Only workspace admins can perform this action.",
    });
  }

  return membership;
}

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const membership = await getAdminMembership(ctx);

    return ctx.db.project.findMany({
      where: {
        workspaceId: membership.workspaceId,
      },
      include: {
        gitHubRepo: true,
        featureRequests: true,
        clientProjectAccess: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Project name is required").max(100),
        description: z.string().min(10, "Description is required").max(1000),
        projectType: z.enum(["EXISTING", "NEW"]),
        techStack: z.string().max(500).optional(),
        existingFeatures: z.string().max(2000).optional(),
        businessGoals: z.string().max(2000).optional(),
        targetUsers: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await getAdminMembership(ctx);

      const project = await ctx.db.project.create({
        data: {
          workspaceId: membership.workspaceId,
          name: input.name,
          description: input.description,
          projectType: input.projectType,
          techStack: input.techStack ?? "",
          existingFeatures: input.existingFeatures ?? "",
          businessGoals: input.businessGoals ?? "",
          targetUsers: input.targetUsers ?? "",
        },
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "project.created",
          entityType: "Project",
          entityId: project.id,
          metadata: JSON.stringify({
            name: project.name,
            projectType: project.projectType,
          }),
        },
      });

      return project;
    }),

  getById: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const membership = await getAdminMembership(ctx);

      const project = await ctx.db.project.findFirst({
        where: {
          id: input.id,
          workspaceId: membership.workspaceId,
        },
        include: {
          gitHubRepo: true,
          featureRequests: {
            orderBy: {
              createdAt: "desc",
            },
          },
          clientProjectAccess: true,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      return project;
    }),
});