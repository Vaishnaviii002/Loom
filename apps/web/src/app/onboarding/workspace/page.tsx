"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/react";

export default function WorkspaceOnboardingPage() {
  const router = useRouter();

  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");

  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: () => {
      router.replace("/admin");
      router.refresh();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanWorkspaceName = workspaceName.trim();

    if (!cleanWorkspaceName) {
      setError("Workspace name is required.");
      return;
    }

    createWorkspace.mutate({
      name: cleanWorkspaceName,
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] px-6 py-10 text-white">
      <section className="w-full max-w-[460px] rounded-[24px] border border-white/10 bg-[#171717] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#aa4825]">
          ShipFlow AI
        </p>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">
          Create workspace
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-white/55">
          Set up your company workspace. You will become the admin of this
          workspace.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/85">
              Workspace name
            </label>

            <input
              type="text"
              required
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Example: SkillHire Team"
              className="h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]/70"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/50">
            This workspace will contain your projects, invited users, feature
            requests, PRDs, developer tasks, GitHub repositories, and review
            history.
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={createWorkspace.isPending}
            className="h-12 w-full rounded-xl bg-[#aa4825] text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createWorkspace.isPending
              ? "Creating workspace..."
              : "Create workspace"}
          </button>
        </form>
      </section>
    </main>
  );
}