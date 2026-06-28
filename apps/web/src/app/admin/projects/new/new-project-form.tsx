"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type RepoMetadata = {
  repoFullName: string;
  repoName: string;
  description: string;
  techStack: string;
  defaultBranch: string;
  url: string;
};

export default function NewProjectForm({
  createProject,
}: {
  createProject: (formData: FormData) => Promise<void>;
}) {
  const [repoFullName, setRepoFullName] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [existingFeatures, setExistingFeatures] = useState("");
  const [businessGoals, setBusinessGoals] = useState("");

  const [repoStatus, setRepoStatus] = useState("");
  const [repoError, setRepoError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function fetchRepoMetadata() {
    const cleanRepo = repoFullName.trim();

    setRepoStatus("");
    setRepoError("");

    if (!cleanRepo) {
      setRepoError("Enter a GitHub repository first.");
      return;
    }

    setRepoStatus("Fetching repository details from GitHub...");

    try {
      const response = await fetch(
        `/api/admin/github/repo-metadata?repo=${encodeURIComponent(cleanRepo)}`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = (await response.json().catch(() => null)) as
        | RepoMetadata
        | { error?: string }
        | null;

      if (!response.ok) {
        setRepoError(
          data && "error" in data
            ? data.error || "Unable to fetch repository details."
            : "Unable to fetch repository details.",
        );
        setRepoStatus("");
        return;
      }

      const metadata = data as RepoMetadata;

      setRepoFullName(metadata.repoFullName || cleanRepo);
      setName(metadata.repoName || "");
      setDescription(metadata.description || "No repository description found.");
      setTechStack(metadata.techStack || "No tech stack detected.");
      setRepoStatus("Repository details fetched successfully.");
    } catch {
      setRepoError("Unable to fetch repository details.");
      setRepoStatus("");
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      createProject(formData);
    });
  }

  return (
    <main className="min-h-screen bg-[#111111] px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin"
          className="text-sm text-white/40 transition hover:text-white"
        >
          ← Projects
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          New project
        </h1>

        <p className="mt-2 text-sm text-white/45">
          Connect a GitHub repository and Loom will automatically fetch
          the project description and tech stack.
        </p>

        <form action={handleSubmit} className="mt-8">
          <section className="rounded-2xl border border-white/10 bg-[#171717] p-6 md:p-8">
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium text-white/75">
                  GitHub repository
                </label>

                <div className="flex gap-3">
                  <input
                    name="repoFullName"
                    value={repoFullName}
                    onChange={(event) => setRepoFullName(event.target.value)}
                    placeholder="owner/repo"
                    required
                    className="h-12 flex-1 rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
                  />

                  <button
                    type="button"
                    onClick={fetchRepoMetadata}
                    className="rounded-xl border border-[#aa4825]/50 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#aa4825]/10"
                  >
                    Fetch from GitHub
                  </button>
                </div>

                {repoStatus && (
                  <p className="mt-3 text-sm text-[#ff8a50]">{repoStatus}</p>
                )}

                {repoError && (
                  <p className="mt-3 text-sm text-red-300">{repoError}</p>
                )}
              </div>

              <Field
                label="Project name"
                name="name"
                value={name}
                onChange={setName}
                placeholder="Automatically fetched from repo"
              />

              <TextAreaField
                label="Description"
                name="description"
                value={description}
                onChange={setDescription}
                placeholder="Automatically fetched from GitHub repository"
                rows={4}
              />

              <Field
                label="Tech stack"
                name="techStack"
                value={techStack}
                onChange={setTechStack}
                placeholder="Automatically detected from repo"
              />

              <TextAreaField
                label="Existing features"
                name="existingFeatures"
                value={existingFeatures}
                onChange={setExistingFeatures}
                placeholder="Optional: Authentication, dashboard, requests, GitHub integration..."
                rows={5}
              />

              <TextAreaField
                label="Business goals"
                name="businessGoals"
                value={businessGoals}
                onChange={setBusinessGoals}
                placeholder="Optional: Reduce delays, improve delivery, track lifecycle..."
                rows={5}
              />
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <Link
                href="/admin"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/60 transition hover:border-[#aa4825]/50 hover:text-white"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-[#aa4825] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Creating..." : "Create project"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-white/75">
        {label}
      </label>

      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-white/75">
        {label}
      </label>

      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
      />
    </div>
  );
}