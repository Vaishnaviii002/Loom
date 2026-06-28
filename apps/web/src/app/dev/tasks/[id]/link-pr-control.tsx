"use client";

import { trpc } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LinkPrControl({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pullRequestUrl, setPullRequestUrl] = useState("");
  const [message, setMessage] = useState("");

  const linkPr = trpc.github.linkTaskPullRequest.useMutation({
    onSuccess: (pr) => {
      setMessage(`Linked PR #${pr.prNumber}: ${pr.title}`);
      setPullRequestUrl("");
      router.refresh();
    },
    onError: (error) => {
      setMessage(error.message);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    linkPr.mutate({
      taskId,
      pullRequestUrl,
    });
  }

  return (
    <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-6">
      <h3 className="text-xl font-semibold text-orange-200">
        Link GitHub Pull Request
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        Paste the real GitHub PR URL for this task. ShipFlow will fetch PR
        metadata using Octokit.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <input
          value={pullRequestUrl}
          onChange={(event) => setPullRequestUrl(event.target.value)}
          required
          type="url"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400"
          placeholder="https://github.com/owner/repo/pull/1"
        />

        {message && (
          <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
            {message}
          </p>
        )}

        <button
          disabled={linkPr.isPending}
          className="rounded-xl bg-orange-500 px-5 py-3 font-medium text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {linkPr.isPending ? "Linking..." : "Link Pull Request"}
        </button>
      </form>
    </div>
  );
}