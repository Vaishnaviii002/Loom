"use client";

import { useState } from "react";
import { LoomLogo } from "@/components/brand/loom-logo";
import type { ReactNode } from "react";

type ClientUser = {
  id: string;
  name: string;
  email: string;
};

type AssignedProject = {
  id: string;
  name: string;
  repoFullName: string;
};

type Project = {
  id: string;
  name: string;
  description: string;
  techStack: string;
  repoFullName: string;
  repoDescription: string;
  repoLanguage: string;
  repoDefaultBranch: string;
  repoUrl: string;
};

type RequestItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  rawDescription: string;
  createdAt: string;
};

type ClientPrd = {
  id: string;
  requestId: string;
  title: string;
  status: string;
  content: string;
  createdAt: string;
};

type ActiveView = "dashboard" | "new-request" | "prds" | "progress";

type AiDraft = {
  title: string;
  type: string;
  priority: string;
  problem: string;
  expectedOutcome: string;
  missingQuestions: string[];
  acceptanceCriteria: string[];
  duplicateRisk: string;
  repositoryContext: string;
  repoUnderstanding: string;
  changeImpact: string;
  affectedAreas: string[];

  shouldProceed?: boolean;
  needsMoreContext?: boolean;
  alreadyExists?: boolean;
  businessProblem?: string;
  whoWillUseIt?: string;
  whoShouldResolve?: string;
  existingFunctionalityCheck?: string;
  requiredFiles?: string[];
  additionalInformationNeeded?: string[];
  prdReadiness?: string;
  clientEducation?: string;
};

const ADDITIONAL_INFO_MARKER = "\n\nAdditional information:\n";

function getRequestDetails(rawDescription: string) {
  return rawDescription.split(ADDITIONAL_INFO_MARKER)[0] || rawDescription;
}

function getAdditionalInfo(rawDescription: string) {
  const parts = rawDescription.split(ADDITIONAL_INFO_MARKER);
  return parts[1] || "";
}

export default function ClientDashboard({
  mode,
  client,
  project,
  requests,
}: {
  mode: "CLIENT" | "ADMIN_PREVIEW";
  client: ClientUser;
  assignedProjects: AssignedProject[];
  project: Project;
  requests: RequestItem[];
}) {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [requestItems, setRequestItems] = useState<RequestItem[]>(requests);
  const [clientPrds, setClientPrds] = useState<ClientPrd[]>([]);

  function handleRequestCreated(request: RequestItem) {
    setRequestItems((current) => [request, ...current]);
  }

  function handleRequestUpdated(updatedRequest: RequestItem) {
    setRequestItems((current) =>
      current.map((request) =>
        request.id === updatedRequest.id ? updatedRequest : request,
      ),
    );
  }

  function handlePrdGenerated(prd: ClientPrd) {
    setClientPrds((current) => [prd, ...current]);
    setActiveView("prds");
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div className="grid min-h-screen lg:grid-cols-[20%_80%]">
        <aside className="flex min-h-screen flex-col border-r border-white/10 bg-[#0f0f0f]">
          <div className="border-b border-white/10 px-5 py-5">
            <LoomLogo size="small" />

            <p className="mt-10 text-s text-white/40">
              {mode === "ADMIN_PREVIEW"
                ? "Admin Client Preview"
                : "Client Portal"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
              Assigned project
            </p>

            <div className="mb-8 rounded-2xl border border-[#aa4825]/50 bg-[#aa4825]/10 p-4">
              <p className="text-sm font-semibold text-[#ff8a50]">
                {project.name}
              </p>
            </div>

            <nav className="space-y-2">
              <SidebarButton
                label="Dashboard"
                active={activeView === "dashboard"}
                onClick={() => setActiveView("dashboard")}
              />

              <SidebarButton
                label="New Request"
                active={activeView === "new-request"}
                onClick={() => setActiveView("new-request")}
              />

              <SidebarButton
                label="PRD"
                active={activeView === "prds"}
                onClick={() => setActiveView("prds")}
              />

              <SidebarButton
                label="Project Progress"
                active={activeView === "progress"}
                onClick={() => setActiveView("progress")}
              />
            </nav>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="truncate text-sm font-medium">
                {client.name || "Client"}
              </p>

              <p className="mt-1 truncate text-xs text-white/40">
                {client.email}
              </p>

              <p className="mt-2 text-xs text-[#aa4825]">
                {mode === "ADMIN_PREVIEW" ? "ADMIN PREVIEW" : "CLIENT"}
              </p>
            </div>
          </div>
        </aside>

        <section className="min-h-screen overflow-y-auto">
          <header className="sticky top-0 z-20 bg-[#111111]/95 px-30 py-10 backdrop-blur">
            <h1 className="text-3xl font-semibold uppercase tracking-[0.22em] text-white">
              Client portal
            </h1>
          </header>

          <div className="px-30 py-5">
            {activeView === "dashboard" && (
              <DashboardView
                project={project}
                requests={requestItems}
                onNewRequest={() => setActiveView("new-request")}
                onPrdGenerated={handlePrdGenerated}
                onRequestUpdated={handleRequestUpdated}
              />
            )}

            {activeView === "new-request" && (
              <NewRequestView
                project={project}
                onRequestCreated={handleRequestCreated}
                onViewDashboard={() => setActiveView("dashboard")}
              />
            )}

            {activeView === "prds" && <PrdView prds={clientPrds} />}

            {activeView === "progress" && (
              <ProgressView requests={requestItems} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardView({
  project,
  requests,
  onNewRequest,
  onPrdGenerated,
  onRequestUpdated,
}: {
  project: Project;
  requests: RequestItem[];
  onNewRequest: () => void;
  onPrdGenerated: (prd: ClientPrd) => void;
  onRequestUpdated: (request: RequestItem) => void;
}) {
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(
    null,
  );
  const [showAiDetails, setShowAiDetails] = useState(false);
  const [extraPrdDetails, setExtraPrdDetails] = useState("");
  const [detailInput, setDetailInput] = useState("");

  const recentRequests = requests.slice(0, 5);

  function closeRequestModal() {
    setSelectedRequest(null);
    setShowAiDetails(false);
    setDetailInput("");
    setExtraPrdDetails("");
  }

  async function sendAdditionalDetail() {
    if (!selectedRequest) {
      return;
    }

    const message = detailInput.trim();

    if (!message) {
      return;
    }

    try {
      const response = await fetch("/api/client/requests/additional-info", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          additionalInfo: message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return;
      }

      const updatedRequest = {
        ...selectedRequest,
        rawDescription: data.rawDescription,
      };

      setSelectedRequest(updatedRequest);
      onRequestUpdated(updatedRequest);
      setDetailInput("");
    } catch {
      return;
    }
  }

  function generatePrdFromRequest(request: RequestItem) {
    const prdContent = [
      `Problem statement`,
      request.rawDescription ||
        "The client request needs to be reviewed and converted into a clear product requirement.",

      `Goals`,
      `- Understand the requested change clearly.
- Convert the client request into an implementation-ready requirement.
- Make sure the final change can be reviewed and approved by the client.`,

      `Non-goals`,
      `- Do not expose source code, internal engineering tasks, pull requests, or AI review details to the client.
- Do not approve engineering work automatically.
- Do not mark the request as shipped from this PRD step.`,

      `User stories`,
      `- As a client, I want this request to be clearly understood so the product team can review it.
- As a product manager, I want the request converted into a structured PRD before engineering starts.
- As a reviewer, I want acceptance criteria so the final implementation can be verified.`,

      `Acceptance criteria`,
      `- The request is clearly scoped.
- The expected outcome is understandable.
- The affected product area is identified.
- The product team can approve or refine the PRD.
- The client can verify the completed result without seeing internal code or reviews.`,

      `Edge cases`,
      `- The request may need more client clarification.
- The requested change may already exist in the product.
- The request may affect multiple pages or user flows.
- The request may need design/business approval before engineering.`,

      `Success metrics`,
      `- PRD is reviewed and approved by the product team.
- Engineering can break the PRD into clear tasks.
- Client can understand what will be delivered.
- Final implementation can be validated against acceptance criteria.`,

      extraPrdDetails.trim()
        ? `Additional client details\n${extraPrdDetails.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    onPrdGenerated({
      id: crypto.randomUUID(),
      requestId: request.id,
      title: request.title,
      status: "GENERATED",
      content: prdContent,
      createdAt: new Date().toISOString(),
    });

    closeRequestModal();
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
        <div className="border-b border-white/10 px-7 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            Details
          </p>

          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {project.name}
          </h2>
        </div>

        <div className="divide-y divide-white/10">
          <InfoRow
            title="Description"
            value={
              project.description ||
              project.repoDescription ||
              "No description was found from the connected GitHub repository."
            }
          />

          <InfoRow
            title="Tech stack"
            value={
              project.techStack ||
              project.repoLanguage ||
              "No tech stack was detected from the connected GitHub repository."
            }
          />

          <InfoRow
            title="GitHub repository"
            value={project.repoFullName || "Repository not connected."}
          />

          <InfoRow
            title="Default branch"
            value={project.repoDefaultBranch || "Not detected."}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-7 py-6">
          <div>
            <h3 className="text-xl font-semibold text-white">
              Recent requests
            </h3>

            <p className="mt-1 text-sm text-white/40">
              Latest requests raised for this assigned project.
            </p>
          </div>

          <button
            type="button"
            onClick={onNewRequest}
            className="rounded-xl bg-[#aa4825] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
          >
            New request
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <div className="px-7 py-8 text-sm text-white/45">
            No requests raised yet. Create the first request for this project.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {recentRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-start justify-between gap-6 px-7 py-5"
              >
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#aa4825]" />

                    <div>
                      <p className="text-base font-semibold text-white">
                        {request.title}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRequest(request)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6 py-8 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#171717]/95 shadow-2xl">
            <div className="flex items-start justify-between gap-5 border-b border-white/10 px-8 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                  Request detail
                </p>

                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  {selectedRequest.title}
                </h3>

                <p className="mt-2 text-sm text-white/40">
                  Full client request information created from AI Discovery.
                </p>
              </div>

              <button
                type="button"
                onClick={closeRequestModal}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/60 transition hover:border-[#aa4825]/50 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(88vh-120px)] overflow-y-auto px-8 py-7">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Type
                  </p>
                  <p className="mt-3 text-base font-semibold text-white">
                    {selectedRequest.type}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Status
                  </p>
                  <p className="mt-3 text-base font-semibold text-white">
                    {selectedRequest.status}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Priority
                  </p>
                  <p className="mt-3 text-base font-semibold text-white">
                    {selectedRequest.priority}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                  Full request details
                </p>

                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-white/55">
                  {getRequestDetails(selectedRequest.rawDescription) ||
                    "No request details were saved."}
                </p>
              </div>

              {getAdditionalInfo(selectedRequest.rawDescription) && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                    Additional information
                  </p>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/55">
                    {getAdditionalInfo(selectedRequest.rawDescription)}
                  </p>
                </div>
              )}

              {showAiDetails && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-white">
                    Add more details
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/40">
                    Add anything missed during ticket creation. These details
                    will stay with this request and can be used while generating
                    the PRD.
                  </p>

                  <textarea
                    value={detailInput}
                    onChange={(event) => setDetailInput(event.target.value)}
                    rows={5}
                    placeholder="Example: Add the picture only to the landing page hero section and keep it responsive."
                    className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
                  />

                  <button
                    type="button"
                    onClick={sendAdditionalDetail}
                    disabled={!detailInput.trim()}
                    className="mt-4 h-12 w-full rounded-xl bg-white/10 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Send
                  </button>
                </div>
              )}

              {extraPrdDetails && (
                <div className="mt-6 ">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                    Additional client details
                  </p>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/55">
                    {extraPrdDetails}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowAiDetails((value) => !value)}
                  className="h-12 flex-1 rounded-xl border border-white/10 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                >
                  {showAiDetails ? "Hide details" : "Add more details"}
                </button>

                <button
                  type="button"
                  onClick={() => generatePrdFromRequest(selectedRequest)}
                  className="h-12 flex-1 rounded-xl bg-[#aa4825] text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
                >
                  Generate PRD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewRequestView({
  project,
  onRequestCreated,
  onViewDashboard,
}: {
  project: Project;
  onRequestCreated: (request: RequestItem) => void;
  onViewDashboard: () => void;
}) {
  const [requestText, setRequestText] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [requestType, setRequestType] = useState("FEATURE");
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function generateRequest() {
    setError("");
    setSuccess("");
    setDraft(null);

    const finalMessage = [requestText.trim(), additionalDetails.trim()]
      .filter(Boolean)
      .join("\n\nAdditional details:\n");

    if (!finalMessage.trim()) {
      setError("Describe the request first.");
      return;
    }

    setIsGenerating(true);

    try {
      const discoveryResponse = await fetch("/api/client/ai-discovery", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.id,
          type: requestType,
          message: finalMessage,
        }),
      });

      const discoveryData = await discoveryResponse.json();

      if (!discoveryResponse.ok) {
        setError(discoveryData?.error || "AI Discovery failed.");
        return;
      }

      const generatedDraft = discoveryData.draft as AiDraft;
      setDraft(generatedDraft);

      const safeType =
        generatedDraft.type === "OTHER" ? "CHANGE" : generatedDraft.type;

      const rawDescription = [
        `Client selected type:\n${requestType}`,
        `Problem:\n${generatedDraft.problem}`,
        `Expected outcome:\n${generatedDraft.expectedOutcome}`,
        `Repository understanding:\n${generatedDraft.repositoryContext}`,
        `Change impact:\n${generatedDraft.changeImpact}`,
        `Likely affected areas:\n${generatedDraft.affectedAreas
          .map((item) => `- ${item}`)
          .join("\n")}`,
        `Acceptance criteria:\n${generatedDraft.acceptanceCriteria
          .map((item) => `- ${item}`)
          .join("\n")}`,
        additionalDetails.trim()
          ? `Additional client details:\n${additionalDetails.trim()}`
          : "",
        `Original client message:\n${requestText}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      setSuccess("Request draft generated. Review it and submit when ready.");
    } catch {
      setError("Unable to generate request.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function submitRequest() {
    setError("");
    setSuccess("");

    if (!draft) {
      setError("Generate the request first before submitting.");
      return;
    }

    const safeType = draft.type === "OTHER" ? "CHANGE" : draft.type;

    const rawDescription = [
      `Client selected type:\n${requestType}`,
      `Problem:\n${draft.problem}`,
      `Expected outcome:\n${draft.expectedOutcome}`,
      `Repository understanding:\n${draft.repositoryContext}`,
      `Change impact:\n${draft.changeImpact}`,
      `Likely affected areas:\n${draft.affectedAreas
        .map((item) => `- ${item}`)
        .join("\n")}`,
      `Acceptance criteria:\n${draft.acceptanceCriteria
        .map((item) => `- ${item}`)
        .join("\n")}`,
      additionalDetails.trim()
        ? `Additional client details:\n${additionalDetails.trim()}`
        : "",
      `Original client message:\n${requestText}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    setIsSubmitting(true);

    try {
      const requestResponse = await fetch("/api/client/requests", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.id,
          title: draft.title,
          type: safeType,
          priority: draft.priority,
          rawDescription,
        }),
      });

      const requestData = await requestResponse.json();

      if (!requestResponse.ok) {
        setError(requestData?.error || "Unable to create request.");
        return;
      }

      onRequestCreated({
        id: String(requestData?.ticketId ?? crypto.randomUUID()),
        title: draft.title,
        type: safeType,
        status: "SUBMITTED",
        priority: draft.priority,
        rawDescription,
        createdAt: new Date().toISOString(),
      });

      setSuccess("Request submitted successfully.");
      onViewDashboard();
    } catch {
      setError("Unable to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const missingQuestions = Array.isArray(draft?.missingQuestions)
    ? draft.missingQuestions
    : [];

  const acceptanceCriteria = Array.isArray(draft?.acceptanceCriteria)
    ? draft.acceptanceCriteria
    : [];

  const affectedAreas = Array.isArray(draft?.affectedAreas)
    ? draft.affectedAreas
    : [];

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
      <div className="grid xl:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-white/10 p-7 xl:sticky xl:top-24 xl:self-start xl:border-b-0 xl:border-r xl:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            AI Discovery Agent
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Create a request
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-7 text-white/45">
            Describe any change, update, bug, feature, design change, landing
            page edit, logo update, background color change, or other product
            request. Loom will read the connected GitHub repository context and
            create a structured request.
          </p>

          <div className="mt-7 space-y-5">
            <div>
              <label className="mb-3 block text-sm font-medium text-white/70">
                Request type
              </label>

              <select
                value={requestType}
                onChange={(event) => setRequestType(event.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition focus:border-[#aa4825]"
              >
                <option value="FEATURE">Feature</option>
                <option value="BUG">Bug report</option>
                <option value="CHANGE">Change / update</option>
                <option value="IMPROVEMENT">Improvement</option>
                <option value="NEW_PRODUCT">New product request</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-white/70">
                Tell AI what you need
              </label>

              <textarea
                value={requestText}
                onChange={(event) => setRequestText(event.target.value)}
                rows={5}
                placeholder="Example: I want to add pictures to the landing page and make the hero section look more premium."
                className="w-full resize-none rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-[#aa4825]/30 bg-[#aa4825]/10 p-4 text-sm text-[#ffb08a]">
                {success}
              </div>
            )}

            <button
              type="button"
              onClick={generateRequest}
              disabled={isGenerating}
              className="h-12 w-full rounded-xl bg-[#aa4825] text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating
                ? "Reading repo and generating..."
                : "Generate request"}
            </button>

            {success && (
              <button
                type="button"
                onClick={onViewDashboard}
                className="h-12 w-full rounded-xl border border-white/10 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
              >
                View in dashboard
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                AI-generated request
              </p>

              <h3 className="mt-4 text-3xl font-semibold tracking-tight">
                Request preview
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowMoreDetails((value) => !value)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
            >
              {showMoreDetails ? "Hide details" : "Add more details"}
            </button>
          </div>

          {showMoreDetails && (
            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium text-white/70">
                Additional details
              </label>

              <textarea
                value={additionalDetails}
                onChange={(event) => setAdditionalDetails(event.target.value)}
                rows={5}
                placeholder="Add deadline, exact image section, design notes, business rules, or extra context..."
                className="w-full resize-none rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-[#aa4825]"
              />
            </div>
          )}

          {draft && (
            <div className="mt-8 space-y-8">
              <TicketSection title="Summary">
                <Point label="Title" value={draft.title} />
                <Point label="Type" value={draft.type} />
                <Point label="Priority" value={draft.priority} />
              </TicketSection>

              <TicketSection title="Details">
                <Point label="Problem" value={draft.problem} />
                <Point label="Expected outcome" value={draft.expectedOutcome} />
                <Point label="Duplicate risk" value={draft.duplicateRisk} />
              </TicketSection>

              <TicketSection title="Repository understanding">
                <Point
                  label="What Loom understood"
                  value={draft.repoUnderstanding || draft.repositoryContext}
                />

                <Point
                  label="Change impact"
                  value={
                    draft.changeImpact ||
                    "Loom could not determine a specific change impact yet."
                  }
                />

                <BulletList
                  label="Likely affected areas"
                  items={affectedAreas}
                  emptyText="No specific affected area detected."
                />
              </TicketSection>

              <TicketSection title="Clarification needed">
                <BulletList
                  label="Follow-up questions"
                  items={missingQuestions}
                  emptyText="No follow-up questions generated."
                />
              </TicketSection>

              <TicketSection title="Acceptance criteria">
                <BulletList
                  label="Success criteria"
                  items={acceptanceCriteria}
                  emptyText="No acceptance criteria generated."
                />
              </TicketSection>

              <div className="border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={submitRequest}
                  disabled={!draft || isSubmitting}
                  className="h-12 w-full rounded-xl bg-[#aa4825] text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting request..." : "Submit request"}
                </button>

                {!success && (
                  <p className="mt-3 text-center text-xs text-white/35">
                    Generate the request first before submitting.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TicketSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h4 className="text-lg font-semibold text-white">{title}</h4>

      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Point({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-[32%_68%]">
      <p className="text-sm font-medium text-white/70">{label}</p>

      <p className="whitespace-pre-wrap text-sm leading-7 text-white/50">
        {value || "Not generated yet."}
      </p>
    </div>
  );
}

function BulletList({
  label,
  items,
  emptyText,
}: {
  label: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[32%_68%]">
      <p className="text-sm font-medium text-white/70">{label}</p>

      <ul className="space-y-2 text-sm leading-7 text-white/50">
        {items.length === 0 ? (
          <li>• {emptyText}</li>
        ) : (
          items.map((item) => <li key={item}>• {item}</li>)
        )}
      </ul>
    </div>
  );
}

function PrdView({ prds }: { prds: ClientPrd[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#171717] p-6">
      <h2 className="text-xl font-semibold">Client-facing PRD</h2>

      <p className="mt-2 text-sm leading-6 text-white/45">
        Final PRDs generated from client requests will appear here. Internal
        engineering tasks, pull requests, code reviews, and implementation
        details stay hidden.
      </p>

      <div className="mt-6">
        {prds.length === 0 ? (
          <EmptyState text="No PRD drafts are available yet." />
        ) : (
          <div className="space-y-5">
            {prds.map((prd) => (
              <section
                key={prd.id}
                className="rounded-2xl border border-white/10 bg-[#101010] p-6"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                      Final PRD
                    </p>

                    <h3 className="mt-3 text-2xl font-semibold text-white">
                      {prd.title}
                    </h3>

                    <p className="mt-2 text-sm text-white/35">
                      Status: {prd.status}
                    </p>
                  </div>

                  <Badge label={prd.status} />
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-[#171717] p-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                    {prd.content}
                  </p>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProgressView({ requests }: { requests: RequestItem[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#171717] p-6">
      <h2 className="text-xl font-semibold">Project progress</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard
          label="Submitted"
          value={requests
            .filter((item) => item.status === "SUBMITTED")
            .length.toString()}
        />

        <StatCard
          label="In review"
          value={requests
            .filter((item) => item.status.includes("REVIEW"))
            .length.toString()}
        />

        <StatCard
          label="In delivery"
          value={requests
            .filter((item) =>
              ["IN_PROGRESS", "DEVELOPMENT"].includes(item.status),
            )
            .length.toString()}
        />

        <StatCard
          label="Shipped"
          value={requests
            .filter((item) => ["SHIPPED", "COMPLETED"].includes(item.status))
            .length.toString()}
        />
      </div>
    </section>
  );
}

function SidebarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
        active
          ? "bg-white/10 text-white"
          : "text-white/50 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function RequestCard({ request }: { request: RequestItem }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#101010] p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-semibold text-white">{request.title}</p>

          <p className="mt-2 text-sm leading-6 text-white/45">
            {request.rawDescription}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge label={request.type} />
          <Badge label={request.status} />
          <Badge label={request.priority} />
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="grid gap-5 px-6 py-5 md:grid-cols-[28%_72%]">
      <p className="text-sm font-medium text-white/65">{title}</p>

      <p className="whitespace-pre-wrap text-sm leading-6 text-white/45">
        {value}
      </p>
    </div>
  );
}

function PreviewBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white/70">{title}</p>

      <p className="mt-2 rounded-xl border border-white/10 bg-[#101010] p-3 text-sm leading-6 text-white/50">
        {value}
      </p>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#aa4825]/40 bg-[#aa4825]/10 px-3 py-1 text-xs text-[#ff8a50]">
      {label}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-white/10 bg-[#101010] p-8 text-sm text-white/45">
      {text}
    </section>
  );
}

function getViewTitle(view: ActiveView) {
  if (view === "dashboard") return "Details";
  if (view === "new-request") return "New Request";
  if (view === "prds") return "PRD";
  return "Project Progress";
}

function getViewSubtitle(view: ActiveView) {
  if (view === "dashboard") {
    return "Project information fetched from the connected GitHub repository, with recent client requests below.";
  }

  if (view === "new-request") {
    return "Talk to AI Discovery to convert a feature, bug, update, or change into a clear ticket.";
  }

  if (view === "prds") {
    return "Review client-facing requirement drafts only. Internal tasks, code, and reviews are hidden.";
  }

  return "Track project progress without seeing code, pull requests, internal tasks, or internal reviews.";
}
