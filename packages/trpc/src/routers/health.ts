import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const healthRouter = createTRPCRouter({
  check: publicProcedure.query(() => {
    return {
      status: "ok",
      service: "shipflow-api",
      message: "tRPC is connected successfully.",
      timestamp: new Date().toISOString(),
    };
  }),

  me: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.session.user.id,
      email: ctx.session.user.email,
      name: ctx.session.user.name ?? null,
    };
  }),
});