"use client";

import { trpc } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApprovePrdButton({ prdId }: { prdId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const approvePrd = trpc.pm.approvePrd.useMutation({
    onSuccess: () => {
      setMessage("PRD approved. Moving to engineering planning...");
      setTimeout(() => {
        router.refresh();
      }, 1000);
    },
    onError: (error) => {
      setMessage(error.message);
    },
  });

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
      <h3 className="text-xl font-semibold text-emerald-200">Approve PRD</h3>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        Approving this PRD confirms that the problem, scope, goals, non-goals,
        and acceptance criteria are ready for engineering planning.
      </p>

      {message && (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
          {message}
        </p>
      )}

      <button
        onClick={() => approvePrd.mutate({ prdId })}
        disabled={approvePrd.isPending}
        className="mt-5 rounded-xl bg-emerald-400 px-5 py-3 font-medium text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {approvePrd.isPending ? "Approving..." : "Approve PRD"}
      </button>
    </div>
  );
}