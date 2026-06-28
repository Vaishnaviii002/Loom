import Link from "next/link";
import ConnectProjectGithubForm from "./connect-project-github-form";

export default async function ConnectProjectGitHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">GitHub Integration</p>
            <h1 className="text-2xl font-semibold">Connect Repository</h1>
          </div>

          <Link
            href={`/admin/projects/${id}`}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Back to Project
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-medium text-orange-300">
            Real GitHub repository
          </p>

          <h2 className="mt-2 text-4xl font-semibold">
            Connect project source code
          </h2>

          <p className="mt-4 max-w-3xl text-slate-400">
            Enter a real GitHub repository in owner/repo format. ShipFlow will
            validate it using Octokit and store it for pull request tracking and
            AI code review.
          </p>

          <ConnectProjectGithubForm projectId={id} />
        </section>
      </div>
    </main>
  );
}