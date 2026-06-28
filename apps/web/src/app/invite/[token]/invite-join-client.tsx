"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteJoinClient({
  token,
  email,
  role,
  workspaceName,
  projectId,
  projectName,
  repository,
  isExpired,
  isAccepted,
  isRevoked,
  canJoin,
}: {
  token: string;
  email: string;
  role: string;
  workspaceName: string;
  projectId: string;
  projectName: string;
  repository: string;
  isExpired: boolean;
  isAccepted: boolean;
  isRevoked: boolean;
  canJoin: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!canJoin) {
      setError("This invite cannot be used.");
      return;
    }

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          name: name.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || "Unable to accept invite.");
        return;
      }

      router.replace(data?.redirectTo || "/auth/redirect");
      router.refresh();
    } catch {
      setError("Something went wrong while accepting the invite.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] px-6 py-10 text-white">
      <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
        <div className="border-b border-white/10 px-8 py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            ShipFlow AI Invite
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Join project
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/45">
            You have been invited to work on{" "}
            <span className="text-white">{projectName}</span> inside{" "}
            <span className="text-white">{workspaceName}</span>.
          </p>

          <div className="mt-5 rounded-xl border border-white/10 bg-[#101010] p-4">
            <p className="text-sm text-white/45">Login email</p>
            <p className="mt-1 text-sm text-white">{email}</p>

            <p className="mt-4 text-sm text-white/45">Assigned role</p>
            <p className="mt-1 text-sm text-white">{role}</p>

            <p className="mt-4 text-sm text-white/45">Assigned project</p>
            <p className="mt-1 text-sm text-white">{projectName}</p>

            <p className="mt-4 text-sm text-white/45">Repository</p>
            <p className="mt-1 text-sm text-white">
              {repository || "Repository not connected yet"}
            </p>
          </div>
        </div>

        {isAccepted ? (
          <div className="space-y-4 px-8 py-7">
            <div className="rounded-xl border border-[#aa4825]/40 bg-[#aa4825]/10 p-4 text-sm text-white/75">
              This invite has already been accepted. Use the invited email to
              sign in.
            </div>

            <div className="rounded-xl border border-white/10 bg-[#101010] p-4 text-sm">
              <p className="text-white/45">Login email</p>
              <p className="mt-1 text-white">{email}</p>

              <p className="mt-4 text-white/45">Password</p>
              <p className="mt-1 text-white/50">The password you created while joining.</p>
            </div>

            <Link
              href={`/auth/sign-in?email=${encodeURIComponent(email)}&next=${encodeURIComponent(
                projectId ? `/client/dashboard?projectId=${projectId}` : "/client/dashboard",
              )}`}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#aa4825] text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
            >
              Sign in to client dashboard
            </Link>
          </div>
        ) : isExpired || isRevoked ? (
          <div className="px-8 py-7">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {isExpired
                ? "This invite has expired. Ask the admin to create a new invite."
                : "This invite has been revoked."}
            </div>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-5 px-8 py-7">
            <div>
              <label className="mb-3 block text-sm font-medium text-white/75">
                Name
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-white/75">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                className="h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="h-12 w-full rounded-xl bg-[#aa4825] text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Joining..." : "Join project"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}