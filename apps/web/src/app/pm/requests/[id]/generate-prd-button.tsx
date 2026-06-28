"use client";

import { trpc } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GeneratePrdButton({
  featureRequestId,
}: {
  featureRequestId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const generatePrd = trpc.pm.generatePrd.useMutation({
    onSuccess: () => {
      setMessage("PRD generation started. Refreshing soon...");
      setTimeout(() => {
        router.refresh();
      }, 2000);
    },
    onError: (error) => {
      setMessage(error.message);
    },
  });

  return (
    <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-6">
      <h3 className="text-xl font-semibold text-orange-200">
        Generate PRD
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        AI will use the client request, discovery conversation, and project
        context to generate a structured PRD with acceptance criteria.
      </p>

      {message && (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
          {message}
        </p>
      )}

      <button
        onClick={() => generatePrd.mutate({ featureRequestId })}
        disabled={generatePrd.isPending}
        className="mt-5 rounded-xl bg-orange-500 px-5 py-3 font-medium text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generatePrd.isPending ? "Starting..." : "Generate PRD"}
      </button>
    </div>
  );
}