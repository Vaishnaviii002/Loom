import { appRouter, createTRPCContext } from "@shipflow/trpc";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function TrpcTestPage() {
  const requestHeaders = await headers();

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  const caller = appRouter.createCaller(
    await createTRPCContext({
      headers: requestHeaders,
      session,
    }),
  );

  const health = await caller.health.check();

  return (
    <main className="min-h-screen bg-slate-950 p-10 text-white">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8">
        <p className="mb-2 text-sm font-medium text-emerald-400">
          ShipFlow API Test
        </p>

        <h1 className="text-3xl font-semibold">tRPC is connected</h1>

        <pre className="mt-6 overflow-auto rounded-xl bg-black/40 p-4 text-sm text-slate-200">
          {JSON.stringify(health, null, 2)}
        </pre>
      </div>
    </main>
  );
}