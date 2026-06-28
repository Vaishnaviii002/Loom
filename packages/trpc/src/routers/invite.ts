import { TRPCError } from "@trpc/server";
import { z } from "zod";
import crypto from "crypto";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const inviteRoleSchema = z.enum([
  "PM",
  "SENIOR_ENG",
  "DEVELOPER",
  "CLIENT",
]);

async function getAdminMembership(ctx: any) {
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
      message: "Only workspace admins can invite members.",
    });
  }

  return membership;
}

function createInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

export const inviteRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const membership = await getAdminMembership(ctx);

    return ctx.db.invite.findMany({
      where: {
        workspaceId: membership.workspaceId,
      },
      include: {
        project: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Valid email is required"),
        role: inviteRoleSchema,
        projectId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await getAdminMembership(ctx);

      const normalizedEmail = input.email.toLowerCase().trim();

      if (input.role === "CLIENT" && !input.projectId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Client invite must be attached to a project.",
        });
      }

      let project = null;

      if (input.projectId) {
        project = await ctx.db.project.findFirst({
          where: {
            id: input.projectId,
            workspaceId: membership.workspaceId,
          },
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found in this workspace.",
          });
        }
      }

      const existingUser = await ctx.db.user.findUnique({
        where: {
          email: normalizedEmail,
        },
        include: {
          memberships: true,
        },
      });

      const alreadyMember = existingUser?.memberships.some(
        (item: { workspaceId: string }) =>
          item.workspaceId === membership.workspaceId,
      );

      if (alreadyMember && input.role !== "CLIENT") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This user is already a member of this workspace.",
        });
      }

      if (alreadyMember && input.role === "CLIENT" && input.projectId) {
        const existingAccess = await ctx.db.clientProjectAccess.findUnique({
          where: {
            clientId_projectId: {
              clientId: existingUser.id,
              projectId: input.projectId,
            },
          },
        });

        if (existingAccess) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This client already has access to this project.",
          });
        }
      }

      await ctx.db.invite.updateMany({
        where: {
          workspaceId: membership.workspaceId,
          email: normalizedEmail,
          status: "PENDING",
        },
        data: {
          status: "REVOKED",
        },
      });

      const token = createInviteToken();

      const invite = await ctx.db.invite.create({
        data: {
          workspaceId: membership.workspaceId,
          projectId: input.projectId ?? null,
          email: normalizedEmail,
          role: input.role,
          token,
          invitedById: ctx.session.user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
        include: {
          project: true,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: membership.workspaceId,
          actorId: ctx.session.user.id,
          action: "invite.created",
          entityType: "Invite",
          entityId: invite.id,
          metadata: JSON.stringify({
            email: invite.email,
            role: invite.role,
            projectId: invite.projectId,
          }),
        },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      return {
        invite,
        inviteUrl: `${appUrl}/invite/${invite.token}`,
      };
    }),

  getByToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.invite.findUnique({
        where: {
          token: input.token,
        },
        include: {
          workspace: true,
          project: true,
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found.",
        });
      }

      if (invite.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite is no longer active.",
        });
      }

      if (invite.expiresAt < new Date()) {
        await ctx.db.invite.update({
          where: {
            id: invite.id,
          },
          data: {
            status: "EXPIRED",
          },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has expired.",
        });
      }

      return {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        workspaceName: invite.workspace.name,
        projectName: invite.project?.name ?? null,
        expiresAt: invite.expiresAt,
      };
    }),

  accept: protectedProcedure
    .input(
      z.object({
        token: z.string().min(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.invite.findUnique({
        where: {
          token: input.token,
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found.",
        });
      }

      if (invite.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite is no longer active.",
        });
      }

      if (invite.expiresAt < new Date()) {
        await ctx.db.invite.update({
          where: {
            id: invite.id,
          },
          data: {
            status: "EXPIRED",
          },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has expired.",
        });
      }

      const currentUserEmail = ctx.session.user.email.toLowerCase();

      if (currentUserEmail !== invite.email.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invite belongs to a different email address.",
        });
      }

      let membership = await ctx.db.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: ctx.session.user.id,
            workspaceId: invite.workspaceId,
          },
        },
      });

      if (!membership) {
        membership = await ctx.db.membership.create({
          data: {
            userId: ctx.session.user.id,
            workspaceId: invite.workspaceId,
            role: invite.role,
          },
        });
      }

      if (invite.role === "CLIENT" && invite.projectId) {
        await ctx.db.clientProjectAccess.upsert({
          where: {
            clientId_projectId: {
              clientId: ctx.session.user.id,
              projectId: invite.projectId,
            },
          },
          update: {},
          create: {
            clientId: ctx.session.user.id,
            projectId: invite.projectId,
          },
        });
      }

      await ctx.db.invite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      await ctx.db.auditLog.create({
        data: {
          workspaceId: invite.workspaceId,
          actorId: ctx.session.user.id,
          action: "invite.accepted",
          entityType: "Invite",
          entityId: invite.id,
          metadata: JSON.stringify({
            email: invite.email,
            role: invite.role,
            projectId: invite.projectId,
          }),
        },
      });

      return membership;
    }),
});