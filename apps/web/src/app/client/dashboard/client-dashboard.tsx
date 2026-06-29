"use client";

import { useEffect, useState } from "react";
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

type ActiveView = "dashboard" | "new-request" | "prds";

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
const CLIENT_PRD_STORAGE_PREFIX = "loom-client-prds:";

function getClientPrdStorageKey(projectId: string) {
  return `${CLIENT_PRD_STORAGE_PREFIX}${projectId}`;
}

function getPrdPreview(content: string) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(0, 7).join("\n");
}

function splitPrdSections(content: string) {
  const headings = [
    "Problem statement",
    "Requested change",
    "Change impact",
    "Acceptance criteria",
    "Edge cases",
    "Success metrics",
    "Additional client details",
  ];

  const sections: Array<{ heading: string; body: string }> = [];

  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index];
    const nextHeading = headings[index + 1];
    const start = content.indexOf(heading);

    if (start === -1) {
      continue;
    }

    const bodyStart = start + heading.length;
    const end = nextHeading ? content.indexOf(nextHeading, bodyStart) : -1;

    sections.push({
      heading,
      body:
        end === -1
          ? content.slice(bodyStart).trim()
          : content.slice(bodyStart, end).trim(),
    });
  }

  return sections;
}

function getRequestDetails(rawDescription: string) {
  return rawDescription.split(ADDITIONAL_INFO_MARKER)[0] || rawDescription;
}

function getAdditionalInfo(rawDescription: string) {
  const parts = rawDescription.split(ADDITIONAL_INFO_MARKER);
  return parts[1] || "";
}

function getStoredSection(rawDescription: string, heading: string) {
  const cleanDescription = getRequestDetails(rawDescription);
  const marker = `${heading}:\n`;
  const start = cleanDescription.indexOf(marker);

  if (start === -1) {
    return "";
  }

  const bodyStart = start + marker.length;
  const nextSection = cleanDescription.indexOf("\n\n", bodyStart);

  if (nextSection === -1) {
    return cleanDescription.slice(bodyStart).trim();
  }

  return cleanDescription.slice(bodyStart, nextSection).trim();
}

function parseStoredList(value: string) {
  return value
    .split("\n")
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

function getDashboardRequestDetails(request: RequestItem) {
  const rawDescription = request.rawDescription;

  return {
    summary: {
      title: request.title,
      type: request.type,
      priority: request.priority,
    },
    details: {
      problem: getStoredSection(rawDescription, "Problem"),
      expectedOutcome: getStoredSection(rawDescription, "Expected outcome"),
      duplicateRisk: getStoredSection(rawDescription, "Duplicate risk"),
    },
    repository: {
      understood:
        getStoredSection(rawDescription, "What Loom understood") ||
        getStoredSection(rawDescription, "Repository understanding"),
      changeImpact: getStoredSection(rawDescription, "Change impact"),
      affectedAreas: parseStoredList(
        getStoredSection(rawDescription, "Likely affected areas"),
      ),
    },
    clarification: {
      questions: parseStoredList(
        getStoredSection(rawDescription, "Follow-up questions"),
      ),
    },
    acceptance: {
      criteria: parseStoredList(
        getStoredSection(rawDescription, "Acceptance criteria"),
      ),
    },
    additionalClientDetails: getStoredSection(
      rawDescription,
      "Additional client details",
    ),
  };
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

  useEffect(() => {
    const savedPrds = window.localStorage.getItem(
      getClientPrdStorageKey(project.id),
    );

    if (!savedPrds) {
      return;
    }

    try {
      const parsedPrds = JSON.parse(savedPrds) as ClientPrd[];

      if (Array.isArray(parsedPrds)) {
        setClientPrds(parsedPrds);
      }
    } catch {
      setClientPrds([]);
    }
  }, [project.id]);

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
    setClientPrds((current) => {
      const nextPrds = [prd, ...current];

      window.localStorage.setItem(
        getClientPrdStorageKey(project.id),
        JSON.stringify(nextPrds),
      );

      return nextPrds;
    });

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

            {activeView === "prds" && (
              <PrdView prds={clientPrds} projectId={project.id} />
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
  const [isGeneratingPrd, setIsGeneratingPrd] = useState(false);
  const [prdError, setPrdError] = useState("");

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

  async function generatePrdFromRequest(request: RequestItem) {
    setPrdError("");
    setIsGeneratingPrd(true);

    try {
      const response = await fetch("/api/client/prds/generate", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.id,
          requestId: request.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPrdError(data?.error || "Unable to generate PRD.");
        return;
      }

      onPrdGenerated(data.prd);
      closeRequestModal();
    } catch {
      setPrdError("Unable to generate PRD.");
    } finally {
      setIsGeneratingPrd(false);
    }
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

              <RequestDetailPreview request={selectedRequest} />

              {/* {showAiDetails && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#aa4825]">
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
              )} */}

              {prdError && (
                <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {prdError}
                </div>
              )}

              <div className="mt-9 flex flex-col gap-3  sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowAiDetails((value) => !value)}
                  className="h-12 flex-1 rounded-xl border border-white/10 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                >
                  {showAiDetails ? "Verify" : "Details"}
                </button>

                <button
                  type="button"
                  onClick={() => generatePrdFromRequest(selectedRequest)}
                  disabled={isGeneratingPrd}
                  className="h-12 flex-1 rounded-xl bg-[#aa4825] text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingPrd ? "Generating PRD..." : "Generate PRD"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestDetailPreview({ request }: { request: RequestItem }) {
  const details = getDashboardRequestDetails(request);

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
        AI request details
      </p>

      <div className="mt-6 space-y-8">
        <TicketSection title="Summary">
          <Point label="Title" value={details.summary.title} />
          <Point label="Type" value={details.summary.type} />
          <Point label="Priority" value={details.summary.priority} />
        </TicketSection>

        <TicketSection title="Details">
          <Point label="Problem" value={details.details.problem} />
          <Point
            label="Expected outcome"
            value={details.details.expectedOutcome}
          />
          <Point label="Duplicate risk" value={details.details.duplicateRisk} />
        </TicketSection>

        <TicketSection title="Repository understanding">
          <Point
            label="What Loom understood"
            value={details.repository.understood}
          />

          <Point label="Change impact" value={details.repository.changeImpact} />

          <BulletList
            label="Likely affected areas"
            items={details.repository.affectedAreas}
            emptyText="No specific affected area detected."
          />
        </TicketSection>

        <TicketSection title="Clarification needed">
          <BulletList
            label="Follow-up questions"
            items={details.clarification.questions}
            emptyText="No follow-up questions generated."
          />
        </TicketSection>

        <TicketSection title="Acceptance criteria">
          <BulletList
            label="Success criteria"
            items={details.acceptance.criteria}
            emptyText="No acceptance criteria generated."
          />
        </TicketSection>

        {details.additionalClientDetails && (
          <TicketSection title="Additional client details">
            <Point label="Client note" value={details.additionalClientDetails} />
          </TicketSection>
        )}
      </div>
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

    const draftMissingQuestions = Array.isArray(draft.missingQuestions)
      ? draft.missingQuestions
      : [];

    const draftAcceptanceCriteria = Array.isArray(draft.acceptanceCriteria)
      ? draft.acceptanceCriteria
      : [];

    const draftAffectedAreas = Array.isArray(draft.affectedAreas)
      ? draft.affectedAreas
      : [];

    const rawDescription = [
      `Client selected type:\n${requestType}`,
      `Problem:\n${draft.problem}`,
      `Expected outcome:\n${draft.expectedOutcome}`,
      `Duplicate risk:\n${draft.duplicateRisk}`,
      `What Loom understood:\n${
        draft.repoUnderstanding || draft.repositoryContext
      }`,
      `Repository understanding:\n${draft.repositoryContext}`,
      `Change impact:\n${draft.changeImpact}`,
      `Likely affected areas:\n${draftAffectedAreas
        .map((item) => `- ${item}`)
        .join("\n")}`,
      `Follow-up questions:\n${draftMissingQuestions
        .map((item) => `- ${item}`)
        .join("\n")}`,
      `Acceptance criteria:\n${draftAcceptanceCriteria
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

function PrdView({
  prds,
  projectId,
}: {
  prds: ClientPrd[];
  projectId: string;
}) {
  const [expandedPrdId, setExpandedPrdId] = useState<string | null>(null);
  const [sendingPrdId, setSendingPrdId] = useState<string | null>(null);
  const [sentPrdIds, setSentPrdIds] = useState<string[]>([]);
  const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    async function loadSentPrds() {
      try {
        const response = await fetch(
          `/api/client/prds/send?projectId=${encodeURIComponent(projectId)}`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          return;
        }

        setSentPrdIds(Array.isArray(data.sentPrdIds) ? data.sentPrdIds : []);
        setSentRequestIds(
          Array.isArray(data.sentRequestIds) ? data.sentRequestIds : [],
        );
      } catch {
        return;
      }
    }

    loadSentPrds();
  }, [projectId]);

  async function sendPrdToPm(prd: ClientPrd) {
    setSendError("");
    setSendingPrdId(prd.id);

    try {
      const response = await fetch("/api/client/prds/send", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          requestId: prd.requestId,
          prdId: prd.id,
          title: prd.title,
          content: prd.content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSendError(data?.error || "Unable to send PRD.");
        return;
      }

      setSentPrdIds((current) =>
        current.includes(prd.id) ? current : [...current, prd.id],
      );

      setSentRequestIds((current) =>
        current.includes(prd.requestId) ? current : [...current, prd.requestId],
      );
    } catch {
      setSendError("Unable to send PRD.");
    } finally {
      setSendingPrdId(null);
    }
  }

  return (
    <section className="py-2">

      {sendError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {sendError}
        </div>
      )}

      {prds.length === 0 ? (
        <EmptyState text="No PRD drafts are available yet." />
      ) : (
        <div className="space-y-6">
          {prds.map((prd) => {
            const isExpanded = expandedPrdId === prd.id;
            const sections = splitPrdSections(prd.content);
            const isSent =
              sentPrdIds.includes(prd.id) ||
              sentRequestIds.includes(prd.requestId);
            const isSending = sendingPrdId === prd.id;
            const visibleStatus = isSent ? "SENT TO PM" : prd.status;

            return (
              <article
                key={prd.id}
                className="rounded-[28px] border border-[#aa4825]/20 bg-white/[0.02] p-8 backdrop-blur-sm transition hover:border-[#aa4825]/40"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-4xl font-semibold tracking-tight text-white">
                      {prd.title}
                    </h3>

                    <p className="mt-3 text-sm text-[#ff9c73]">
                      Status: {visibleStatus}
                    </p>
                  </div>

                  <Badge label={visibleStatus} />
                </div>

                {!isExpanded ? (
                  <div className="mt-8">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                      {getPrdPreview(prd.content)}
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setExpandedPrdId(prd.id)}
                        className="h-12 flex-1 rounded-xl border border-[#aa4825]/25 bg-[#aa4825]/10 px-5 text-sm font-semibold text-[#ff9c73] transition hover:border-[#aa4825]/50 hover:bg-[#aa4825]/15"
                      >
                        View more
                      </button>

                      <button
                        type="button"
                        onClick={() => sendPrdToPm(prd)}
                        disabled={isSending || isSent}
                        className="h-12 flex-1 rounded-xl bg-[#aa4825] px-5 text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSent
                          ? "Completed"
                          : isSending
                            ? "Sending..."
                            : "Send PRD"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-10 space-y-9">
                    {sections.length === 0 ? (
                      <p className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                        {prd.content}
                      </p>
                    ) : (
                      sections.map((section) => (
                        <section key={section.heading}>
                          <h4 className="text-xl font-semibold text-[#ff9c73]">
                            {section.heading}:
                          </h4>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/55">
                            {section.body || "No details provided."}
                          </p>
                        </section>
                      ))
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setExpandedPrdId(null)}
                        className="h-12 flex-1 rounded-xl border border-white/10 px-5 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                      >
                        Show less
                      </button>

                      <button
                        type="button"
                        onClick={() => sendPrdToPm(prd)}
                        disabled={isSending || isSent}
                        className="h-12 flex-1 rounded-xl bg-[#aa4825] px-5 text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSent
                          ? "Completed"
                          : isSending
                            ? "Sending..."
                            : "Send PRD"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
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
  return "PRD";
}

function getViewSubtitle(view: ActiveView) {
  if (view === "dashboard") {
    return "Project information fetched from the connected GitHub repository, with recent client requests below.";
  }

  if (view === "new-request") {
    return "Talk to AI Discovery to convert a feature, bug, update, or change into a clear ticket.";
  }

  return "Review client-facing requirement drafts only. Internal tasks, code, and reviews are hidden.";
}
