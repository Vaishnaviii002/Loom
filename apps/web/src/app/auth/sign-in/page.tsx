"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsPending(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/auth/redirect",
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password.");
        return;
      }

      router.push("/auth/redirect");
      router.refresh();
    } catch {
      setError("Something went wrong while signing in.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] px-6 text-white">
      <section className="w-full max-w-[460px] rounded-[26px] border border-white/10 bg-[#171717] p-9 shadow-[0_26px_80px_rgba(0,0,0,0.44)]">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#aa4825]">
          ShipFlow AI
        </p>

        <h1 className="mt-5 text-[34px] font-semibold tracking-tight text-white">
          Sign in
        </h1>

        <p className="mt-3 text-sm leading-6 text-white/55">
          Sign in with your ShipFlow AI account.
        </p>

        <form onSubmit={handleSubmit} className="mt-9 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/85">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-13 w-full rounded-[15px] border border-white/10 bg-[#101010] px-5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]/70"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/85">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="h-13 w-full rounded-[15px] border border-white/10 bg-[#101010] px-5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]/70"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="h-13 w-full rounded-[15px] bg-[#aa4825] text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-7 text-center text-sm text-white/50">
          New to ShipFlow AI?{" "}
          <Link
            href="/auth/sign-up"
            className="text-white/70 transition hover:text-[#aa4825]"
          >
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}