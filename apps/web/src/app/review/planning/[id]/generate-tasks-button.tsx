"use client";

import { trpc } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GenerateTasksButton({
  featureRequestId,
}: {
  featureRequestId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const generateTasks = trpc.seniorEngineer.generateTasks.useMutation({
    onSuccess: () => {
      setMessage("Task generation started. Refreshing soon...");
      setTimeout(() => {
        router.refresh();
      }, 2500);
    },
    onError: (error) => {
      setMessage(error.message);
    },
  });

  return (
    <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-6">
      <h3 className="text-xl font-semibold text-orange-200">
        Generate Engineering Tasks
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        ShipFlow AI will convert the approved PRD and acceptance criteria into
        developer-ready tasks.
      </p>

      {message && (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
          {message}
        </p>
      )}

      <button
        onClick={() => generateTasks.mutate({ featureRequestId })}
        disabled={generateTasks.isPending}
        className="mt-5 rounded-xl bg-orange-500 px-5 py-3 font-medium text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generateTasks.isPending ? "Starting..." : "Generate Tasks"}
      </button>
    </div>
  );
}