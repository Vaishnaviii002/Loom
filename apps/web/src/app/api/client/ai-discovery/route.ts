import { auth } from "@/lib/auth";
import { getRepositoryContextForRequest } from "@/lib/github-repo-context";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const AI_DISCOVERY_SYSTEM_PROMPT = `
You are Loom AI Discovery Agent for a production-grade enterprise software lifecycle platform.

Your job is NOT to blindly create tickets.
Your job is to understand the client's request, analyze the connected GitHub repository context, detect whether the request is actually needed, gather missing requirements, and only then prepare a structured request draft.

You must behave like a senior product analyst + technical discovery agent.

CORE RESPONSIBILITIES

1. Understand the client request
- Identify whether the request is a FEATURE, BUG, CHANGE, IMPROVEMENT, NEW_PRODUCT, or OTHER.
- Understand the business problem behind the request.
- Identify who will use this change.
- Identify expected behavior after the change.
- Identify edge cases, missing requirements, and unclear parts.

2. Analyze the GitHub repository context
Use only the repository context provided to you.
Do not invent files, routes, components, or features that are not present in the context.

3. Detect if the feature already exists
Not every client request should become a new build task.
If the requested functionality already exists or appears to be mostly present:
- Tell the client clearly that the functionality may already exist.
- Explain where it appears to exist.
- Suggest whether this is a training issue, UI improvement, documentation note, or small change instead of a full feature request.

4. Ask follow-up questions when context is missing
If important requirements are missing, ask specific follow-up questions.
Do not ask generic questions.
Ask only questions needed to make the request implementation-ready.

5. Explain ownership and impact
Identify:
- who should resolve it
- where in the product/repository it likely belongs
- required files or areas from the provided repo context only
- how the change may impact UX, UI, backend, QA, or existing flows

OUTPUT RULES

Return JSON only.
Do not include markdown.
Do not include prose outside JSON.
Do not expose full source code.
Do not invent files or features.

JSON shape:
{
  "title": "clear request title",
  "type": "FEATURE | BUG | CHANGE | IMPROVEMENT | NEW_PRODUCT | OTHER",
  "priority": "LOW | MEDIUM | HIGH | URGENT",
  "shouldProceed": true,
  "needsMoreContext": false,
  "alreadyExists": false,
  "duplicateRisk": "LOW | MEDIUM | HIGH",
  "businessProblem": "business problem the request solves",
  "problem": "clear problem statement",
  "expectedOutcome": "expected behavior/result",
  "whoWillUseIt": "main user/role affected",
  "whoShouldResolve": "likely owner role/team",
  "repositoryContext": "client-safe summary of repository understanding",
  "repoUnderstanding": "what Loom understood from the repo",
  "existingFunctionalityCheck": "whether similar functionality exists and where",
  "requiredFiles": ["client-safe likely files or areas from provided context only"],
  "affectedAreas": ["client-safe affected product areas"],
  "changeImpact": "how the change may affect product behavior, UI, backend, QA, or user flow",
  "missingQuestions": ["specific follow-up questions if needed"],
  "acceptanceCriteria": ["clear success/verification criteria"],
  "additionalInformationNeeded": ["missing business, design, technical, or user context"],
  "prdReadiness": "READY | NEEDS_MORE_CONTEXT | DO_NOT_BUILD | ALREADY_EXISTS",
  "clientEducation": "explain if the client may be confused about existing functionality, otherwise empty string"
}
`;

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

function normalizeRequestType(value: string) {
  const allowed = [
    "FEATURE",
    "BUG",
    "CHANGE",
    "IMPROVEMENT",
    "NEW_PRODUCT",
    "OTHER",
  ];

  if (allowed.includes(value)) {
    return value;
  }

  return "FEATURE";
}

function getPriority(message: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("urgent") ||
    lower.includes("critical") ||
    lower.includes("blocked") ||
    lower.includes("production") ||
    lower.includes("broken")
  ) {
    return "HIGH";
  }

  if (lower.includes("minor") || lower.includes("small")) {
    return "LOW";
  }

  return "MEDIUM";
}

function cleanTitle(message: string, fallbackType: string) {
  const firstLine = message
    .split("\n")
    .find((line) => line.trim().length > 0)
    ?.trim();

  if (!firstLine) {
    return `${fallbackType.toLowerCase()} request`;
  }

  return firstLine.length > 90 ? `${firstLine.slice(0, 87)}...` : firstLine;
}

function safeJsonParse(value: string): AiDraft | null {
  try {
    const cleaned = value
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    return JSON.parse(cleaned) as AiDraft;
  } catch {
    return null;
  }
}

function fallbackDraft({
  message,
  type,
  repoFullName,
  repoSummary,
  techStack,
  affectedAreas,
}: {
  message: string;
  type: string;
  repoFullName: string;
  repoSummary: string;
  techStack: string;
  affectedAreas: string[];
}): AiDraft {
  return {
    title: cleanTitle(message, type),
    type,
    priority: getPriority(message),
    shouldProceed: true,
    needsMoreContext: true,
    alreadyExists: false,
    businessProblem:
      "The business problem needs to be confirmed with the client before this becomes implementation-ready.",
    problem: message,
    expectedOutcome:
      "The requested change should be reviewed by the product team and converted into a clear implementation-ready requirement.",
    whoWillUseIt: "Client/user role needs confirmation.",
    whoShouldResolve:
      "Product Manager should clarify requirements first, then Senior Engineer can break it into tasks.",
    missingQuestions: [
      "Who is the main user affected by this change?",
      "What exact behavior or visual result should be visible after the change?",
      "Are there any brand, design, deadline, or business constraints?",
    ],
    acceptanceCriteria: [
      "The change is clearly described and scoped for this project.",
      "The product team can review the request and convert it into a PRD.",
      "The final delivery can be verified by the client without exposing internal code or reviews.",
    ],
    duplicateRisk:
      "No duplicate check could be confirmed automatically. Product Manager should verify if this behavior already exists.",
    repositoryContext: [
      `Repository: ${repoFullName || "Not connected"}`,
      `Tech stack: ${techStack || "Not detected"}`,
      `Repository summary: ${repoSummary}`,
    ].join("\n"),
    repoUnderstanding:
      "Loom reviewed the connected repository metadata and selected relevant project files for this request.",
    existingFunctionalityCheck:
      "Loom could not fully confirm whether this already exists from fallback analysis.",
    requiredFiles: affectedAreas,
    changeImpact:
      "This request may require updates in the project UI or product behavior depending on the selected files.",
    affectedAreas,
    additionalInformationNeeded: [
      "Exact user flow/page where the change should appear.",
      "Expected behavior after the change.",
      "Business or design constraints.",
    ],
    prdReadiness: "NEEDS_MORE_CONTEXT",
    clientEducation: "",
  };
}

async function generateDraftWithOpenAI({
  message,
  type,
  projectName,
  repoFullName,
  repoDescription,
  techStack,
  defaultBranch,
  repoSummary,
  relevantFiles,
}: {
  message: string;
  type: string;
  projectName: string;
  repoFullName: string;
  repoDescription: string;
  techStack: string;
  defaultBranch: string;
  repoSummary: string;
  relevantFiles: Array<{ path: string; content: string }>;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const fileContext = relevantFiles
    .map(
      (file) => `FILE: ${file.path}\n---\n${file.content.slice(0, 6000)}\n---`,
    )
    .join("\n\n");

  const repoPromptContext = {
    project: {
      name: projectName,
    },
    repository: {
      repoFullName,
      description: repoDescription || "No GitHub description.",
      defaultBranch,
      techStack: techStack || "Not detected",
      repoSummary,
    },
    relevantFiles: relevantFiles.map((file) => ({
      path: file.path,
      excerpt: file.content.slice(0, 6000),
    })),
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: AI_DISCOVERY_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `
Client request:
${message}

Selected request type:
${type}

Repository context:
${JSON.stringify(repoPromptContext, null, 2)}

Relevant repository file context:
${fileContext}

Analyze the request against the repository context.
Check if it already exists.
Check if it is duplicate or unnecessary.
Ask follow-up questions if context is missing.
Explain who should resolve it.
Explain likely required files or areas.
Explain product impact.
If valid, prepare the request for later PRD generation.
Return JSON only.
`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  const content = String(data?.choices?.[0]?.message?.content ?? "");
  return safeJsonParse(content);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const projectId = String(body.projectId ?? "").trim();
    const message = String(body.message ?? "").trim();
    const type = normalizeRequestType(String(body.type ?? "FEATURE").trim());

    if (!projectId) {
      return NextResponse.json(
        { error: "Project id is required." },
        { status: 400 },
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Request message is required." },
        { status: 400 },
      );
    }

    const membership = await db.membership.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const isClient = membership.role === "CLIENT";
    const isAdmin = membership.role === "ADMIN";

    let project: {
      id: string;
      name: string;
      description: string | null;
      techStack: string | null;
      workspaceId: string;
      gitHubRepo: {
        repoFullName: string;
      } | null;
    } | null = null;

    if (isClient) {
      const access = await db.clientProjectAccess.findFirst({
        where: {
          clientId: session.user.id,
          projectId,
        },
        include: {
          project: {
            include: {
              gitHubRepo: true,
            },
          },
        },
      });

      project = access?.project ?? null;
    }

    if (isAdmin) {
      project = await db.project.findFirst({
        where: {
          id: projectId,
          workspaceId: membership.workspaceId,
        },
        include: {
          gitHubRepo: true,
        },
      });
    }

    if (!project) {
      return NextResponse.json(
        { error: "You do not have access to this project." },
        { status: 403 },
      );
    }

    const repoFullName = project.gitHubRepo?.repoFullName ?? "";

    const repoContext = repoFullName
      ? await getRepositoryContextForRequest({
          repoFullName,
          message,
        })
      : null;

    const affectedAreas =
      repoContext?.relevantFiles.slice(0, 5).map((file) => file.path) ?? [];

    const aiDraft = repoContext
      ? await generateDraftWithOpenAI({
          message,
          type,
          projectName: project.name,
          repoFullName: repoContext.repoFullName,
          repoDescription: repoContext.description,
          techStack: repoContext.techStack || project.techStack || "",
          defaultBranch: repoContext.defaultBranch,
          repoSummary: repoContext.repoSummary,
          relevantFiles: repoContext.relevantFiles,
        })
      : null;

    const draft =
      aiDraft ??
      fallbackDraft({
        message,
        type,
        repoFullName,
        repoSummary:
          repoContext?.repoSummary ||
          project.description ||
          "Repository context is not available.",
        techStack: repoContext?.techStack || project.techStack || "",
        affectedAreas,
      });

    return NextResponse.json({
      draft,
      repo: repoContext
        ? {
            repoFullName: repoContext.repoFullName,
            defaultBranch: repoContext.defaultBranch,
            techStack: repoContext.techStack,
            relevantFileCount: repoContext.relevantFiles.length,
          }
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI Discovery failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}





