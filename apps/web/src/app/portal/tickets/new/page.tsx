"use client";

import { trpc } from "@/trpc/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type RequestType =
  | "BUG"
  | "CRITICAL_BUG"
  | "FEATURE"
  | "IMPROVEMENT"
  | "NEW_PRODUCT"
  | "OTHER";

type ProjectOption = {
  id: string;
  name: string;
  projectType: "EXISTING" | "NEW";
  description: string;
};

const requestTypes: {
  label: string;
  value: RequestType;
  description: string;
}[] = [
  {
    label: "Feature",
    value: "FEATURE",
    description: "A new capability for an existing product.",
  },
  {
    label: "Bug",
    value: "BUG",
    description: "Something is broken but not blocking production.",
  },
  {
    label: "Critical Bug",
    value: "CRITICAL_BUG",
    description: "A serious production issue that needs urgent attention.",
  },
  {
    label: "Improvement",
    value: "IMPROVEMENT",
    description: "A UX, performance, workflow, or quality improvement.",
  },
  {
    label: "New Product",
    value: "NEW_PRODUCT",
    description: "A request for a new product or new build scope.",
  },
  {
    label: "Other",
    value: "OTHER",
    description: "Something that does not fit the above categories.",
  },
];

export default function NewClientTicketPage() {
  const router = useRouter();

  const projects = trpc.featureRequest.getClientProjects.useQuery();

  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState<RequestType>("FEATURE");
  const [title, setTitle] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [message, setMessage] = useState("");

  const selectedProject = useMemo(() => {
    return (projects.data as ProjectOption[] | undefined)?.find(
      (project) => project.id === projectId,
    );
  }, [projects.data, projectId]);

  const createRequest = trpc.featureRequest.create.useMutation({
    onSuccess: (request) => {
      router.push(`/portal/tickets/${request.id}`);
      router.refresh();
    },
    onError: (error) => {
      setMessage(error.message);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    createRequest.mutate({
      projectId,
      type,
      title,
      rawDescription,
    });
  }

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">Customer Portal</p>
            <h1 className="text-2xl font-semibold">Raise Request</h1>
          </div>

          <Link
            href="/portal"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-medium text-orange-300">
            Request intake
          </p>

          <h2 className="mt-2 text-4xl font-semibold">
            Tell us what needs to change
          </h2>

          <p className="mt-4 max-w-3xl text-slate-400">
            Add the initial details. After this, Loom will clarify the
            requirement, check if it already exists, and ask follow-up questions
            if the context is incomplete.
          </p>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-8"
        >
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Select project
              </label>

              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400"
              >
                <option value="">Choose assigned project</option>

                {(projects.data as ProjectOption[] | undefined)?.map(
                  (project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} —{" "}
                      {project.projectType === "EXISTING"
                        ? "Existing Product"
                        : "New Product"}
                    </option>
                  ),
                )}
              </select>

              {selectedProject && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-slate-500">Project context</p>
                  <p className="mt-1 font-medium">{selectedProject.name}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    {selectedProject.description}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-3 block text-sm text-slate-300">
                Request type
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                {requestTypes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setType(item.value)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      type === item.value
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-black/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-2 text-sm leading-5 text-slate-400">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Short title
              </label>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={100}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400"
                placeholder="Secure login with brute force protection"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Initial description
              </label>

              <textarea
                value={rawDescription}
                onChange={(event) => setRawDescription(event.target.value)}
                required
                rows={7}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400"
                placeholder="Explain the problem, who is affected, what you expect, urgency, and any known edge cases."
              />
            </div>

            {message && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {message}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/10 pt-6">
              <p className="text-sm text-slate-400">
                This creates a ticket and starts the requirement discovery flow.
              </p>

              <button
                disabled={createRequest.isPending}
                className="rounded-xl bg-orange-500 px-5 py-3 font-medium text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createRequest.isPending
                  ? "Creating ticket..."
                  : "Create ticket"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}