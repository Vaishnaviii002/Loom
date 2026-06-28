"use client";

import { trpc } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TaskStatus = "ASSIGNED" | "IN_PROGRESS" | "DONE" | "BLOCKED";

const statusOptions: {
  label: string;
  value: TaskStatus;
  description: string;
}[] = [
  {
    label: "Assigned",
    value: "ASSIGNED",
    description: "Task is assigned but not started.",
  },
  {
    label: "In Progress",
    value: "IN_PROGRESS",
    description: "Work has started.",
  },
  {
    label: "Done",
    value: "DONE",
    description: "Implementation is complete.",
  },
  {
    label: "Blocked",
    value: "BLOCKED",
    description: "Task is blocked and needs help.",
  },
];

export default function TaskStatusControl({
  taskId,
  currentStatus,
}: {
  taskId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus>(
    currentStatus as TaskStatus,
  );
  const [message, setMessage] = useState("");

  const updateStatus = trpc.developer.updateTaskStatus.useMutation({
    onSuccess: () => {
      setMessage("Task status updated.");
      router.refresh();
    },
    onError: (error) => {
      setMessage(error.message);
    },
  });

  return (
    <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-6">
      <h3 className="text-xl font-semibold text-orange-200">
        Update Task Status
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        Keep the engineering workflow accurate by updating your task status.
        GitHub pull request linking comes next.
      </p>

      <div className="mt-5 space-y-3">
        {statusOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setStatus(item.value)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              status === item.value
                ? "border-orange-500 bg-orange-500/10"
                : "border-white/10 bg-black/20 hover:bg-white/[0.05]"
            }`}
          >
            <p className="font-medium">{item.label}</p>
            <p className="mt-1 text-sm text-slate-400">{item.description}</p>
          </button>
        ))}
      </div>

      {message && (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
          {message}
        </p>
      )}

      <button
        disabled={updateStatus.isPending || status === currentStatus}
        onClick={() => updateStatus.mutate({ taskId, status })}
        className="mt-5 rounded-xl bg-orange-500 px-5 py-3 font-medium text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {updateStatus.isPending ? "Updating..." : "Update Status"}
      </button>
    </div>
  );
}