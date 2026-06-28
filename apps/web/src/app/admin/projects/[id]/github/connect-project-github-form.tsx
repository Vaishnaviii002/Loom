"use client";

import { trpc } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function ConnectProjectGithubForm({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();

  const [repoFullName, setRepoFullName] = useState("");
  const [message, setMessage] = useState("");

  const connectRepo = trpc.github.connectProjectRepo.useMutation({
    onSuccess: (repo) => {
      setMessage(`Connected ${repo.repoFullName}`);

      setTimeout(() => {
        router.push(`/admin/projects/${projectId}`);
        router.refresh();
      }, 1000);
    },
    onError: (error) => {
      setMessage(error.message);
    },
  });

  function normalizeRepoInput(value: string) {
    return value
      .trim()
      .replace("https://github.com/", "")
      .replace("http://github.com/", "")
      .replace(/^\/+|\/+$/g, "");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const normalizedRepo = normalizeRepoInput(repoFullName);

    connectRepo.mutate({
      projectId,
      repoFullName: normalizedRepo,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label className="mb-2 block text-sm text-slate-300">Repository</label>

        <input
          value={repoFullName}
          onChange={(event) => setRepoFullName(event.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400"
          placeholder="Vaishnaviii002/SkillHire"
        />

        <p className="mt-2 text-sm text-slate-500">
          Use format: Vaishnaviii002/SkillHire
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
        Project ID being connected:{" "}
        <span className="text-orange-300">{projectId}</span>
      </div>

      {message && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-200">
          {message}
        </div>
      )}

      <button
        disabled={connectRepo.isPending}
        className="rounded-xl bg-orange-500 px-5 py-3 font-medium text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {connectRepo.isPending ? "Connecting..." : "Connect Repository"}
      </button>
    </form>
  );
}