"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Name is required.");
      return;
    }

    if (!cleanEmail) {
      setError("Email is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          callbackURL: "/admin",
        }),
      });

      const text = await response.text();

      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        console.error("SIGN_UP_API_ERROR:", {
          status: response.status,
          text,
          data,
        });

        setError(
          data?.message ||
            data?.error?.message ||
            `Signup failed with status ${response.status}. Check terminal.`,
        );

        return;
      }

      const bootstrapResponse = await fetch(
  "/api/shipflow-auth/bootstrap-admin-workspace",
  {
    method: "POST",
    credentials: "include",
  },
);

const bootstrapData = await bootstrapResponse.json().catch(() => null);

if (!bootstrapResponse.ok) {
  setError(
    bootstrapData?.error ||
      `Workspace setup failed with status ${bootstrapResponse.status}.`,
  );
  return;
}

router.replace("/admin");
router.refresh();
    } catch (caughtError) {
      console.error("SIGN_UP_FETCH_ERROR:", caughtError);

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Signup request failed. Check browser console and terminal.";

      setError(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] px-6 py-10 text-white">
      <section className="w-full max-w-[460px] rounded-[24px] border border-white/10 bg-[#171717] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#aa4825]">
          ShipFlow AI
        </p>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">
          Create account
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-white/55">
          Create the first workspace account. We will assign your role after
          this.
        </p>

        <form onSubmit={handleSignUp} className="mt-7 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/85">
              Name
            </label>

            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]/70"
            />
          </div>

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
              className="h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]/70"
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
              placeholder="Minimum 8 characters"
              className="h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]/70"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="h-12 w-full rounded-xl bg-[#aa4825] text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/50">
          Already have account?{" "}
          <Link
            href="/auth/sign-in"
            className="text-white/70 transition hover:text-[#aa4825]"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}