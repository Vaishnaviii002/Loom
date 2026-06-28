import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export const workspaceRouter = createTRPCRouter({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.membership.findMany({
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

    return memberships;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Workspace name is required").max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingUser = await ctx.db.user.findUnique({
        where: {
          id: ctx.session.user.id,
        },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User does not exist.",
        });
      }

      const baseSlug = createSlug(input.name);

      if (!baseSlug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Workspace name must contain letters or numbers.",
        });
      }

      let slug = baseSlug;
      let count = 1;

      while (await ctx.db.workspace.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${count}`;
        count++;
      }

      const workspace = await ctx.db.workspace.create({
        data: {
          name: input.name,
          slug,
          plan: "FREE",
          credits: 10,
          memberships: {
            create: {
              userId: ctx.session.user.id,
              role: "ADMIN",
            },
          },
          subscription: {
            create: {
              plan: "FREE",
              creditsRemaining: 10,
              repoLimit: 1,
              status: "ACTIVE",
            },
          },
        },
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actorId: ctx.session.user.id,
          action: "workspace.created",
          entityType: "Workspace",
          entityId: workspace.id,
          metadata: JSON.stringify({
            name: workspace.name,
            slug: workspace.slug,
            plan: workspace.plan,
          }),
        },
      });

      return workspace;
    }),
});