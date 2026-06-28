import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { db } from "@shipflow/db";

export type ShipFlowSession =
  | {
      user: {
        id: string;
        email: string;
        name?: string | null;
        image?: string | null;
      };
      session: {
        id: string;
        userId: string;
        expiresAt: Date;
      };
    }
  | null;

export type CreateTRPCContextOptions = {
  headers: Headers;
  session: ShipFlowSession;
};

export async function createTRPCContext(opts: CreateTRPCContextOptions) {
  return {
    db,
    headers: opts.headers,
    session: opts.session,
  };
}

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});