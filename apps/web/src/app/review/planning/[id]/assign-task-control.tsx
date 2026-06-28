"use client";

import { trpc } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DeveloperOption = {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
};

export default function AssignTaskControl({
  taskId,
  assignedToId,
}: {
  taskId: string;
  assignedToId?: string | null;
}) {
  const router = useRouter();
  const [developerId, setDeveloperId] = useState(assignedToId ?? "");
  const [message, setMessage] = useState("");

  const developers = trpc.seniorEngineer.developerOptions.useQuery();

  const assignTask = trpc.seniorEngineer.assignTask.useMutation({
    onSuccess: () => {
      setMessage("Task assigned.");
      router.refresh();
    },
    onError: (error) => {
      setMessage(error.message);
    },
  });

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <label className="mb-2 block text-sm text-slate-400">
        Assign developer
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={developerId}
          onChange={(event) => setDeveloperId(event.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400"
        >
          <option value="">Select developer</option>

          {(developers.data as DeveloperOption[] | undefined)?.map((item) => (
            <option key={item.user.id} value={item.user.id}>
              {item.user.name || item.user.email}
            </option>
          ))}
        </select>

        <button
          disabled={!developerId || assignTask.isPending}
          onClick={() => assignTask.mutate({ taskId, developerId })}
          className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-medium text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {assignTask.isPending ? "Assigning..." : "Assign"}
        </button>
      </div>

      {message && <p className="mt-3 text-sm text-slate-400">{message}</p>}
    </div>
  );
}