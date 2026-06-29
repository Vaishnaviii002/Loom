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

function getRequestSpecificContext(message: string, type: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("logo") ||
    lower.includes("brand") ||
    lower.includes("icon")
  ) {
    return {
      productArea: "Branding / header / visual identity",
      expectedOutcome:
        "The product logo or brand element should be updated in the visible UI without breaking layout consistency.",
      owner:
        "Frontend Developer should handle the UI change. Product Manager should confirm brand asset, size, placement, and usage rules.",
      impact:
        "This may affect the header, navigation, landing page branding, and visual consistency across public-facing screens.",
      questions: [
        "Which logo should be used and is the final asset available?",
        "Where should the logo be updated: landing page only, dashboard, auth pages, or everywhere?",
        "Should the logo size, color, spacing, or placement change?",
      ],
      criteria: [
        "The correct logo is visible in the requested product area.",
        "The logo remains responsive across screen sizes.",
        "The update does not break header, navigation, or page layout.",
      ],
    };
  }

  if (
    lower.includes("picture") ||
    lower.includes("image") ||
    lower.includes("photo") ||
    lower.includes("landing")
  ) {
    return {
      productArea: "Landing page / hero section / visual content",
      expectedOutcome:
        "The landing page should display the requested image content in the correct section with responsive layout and clean visual alignment.",
      owner:
        "Frontend Developer should implement the UI update. Product Manager should confirm number of images, placement, and visual rules.",
      impact:
        "This may affect landing page layout, image loading, responsiveness, visual hierarchy, and user first impression.",
      questions: [
        "Which landing page section should contain the image: hero, features, testimonials, or another section?",
        "How many images should be shown and what are the minimum/maximum image requirements?",
        "Should images be uploaded by admin, hardcoded as static assets, or fetched dynamically?",
      ],
      criteria: [
        "Images appear in the correct landing page section.",
        "Images are responsive on desktop and mobile.",
        "The page layout remains clean and does not shift unexpectedly.",
      ],
    };
  }

  if (
    lower.includes("login") ||
    lower.includes("sign in") ||
    lower.includes("password") ||
    lower.includes("auth")
  ) {
    return {
      productArea: "Authentication / sign-in flow",
      expectedOutcome:
        "The authentication flow should allow the correct user role to sign in and reach the correct role-based dashboard.",
      owner:
        "Backend Developer should verify authentication/session logic. Frontend Developer should verify sign-in UI and redirects.",
      impact:
        "This may affect login, session handling, role-based routing, invite acceptance, and dashboard access control.",
      questions: [
        "Which role is affected: client, admin, PM, developer, or reviewer?",
        "Should the user be redirected to a specific project after login?",
        "Is this issue happening after invite acceptance or normal sign-in?",
      ],
      criteria: [
        "The correct user can sign in with valid credentials.",
        "The user is redirected to the correct role-based dashboard.",
        "Unauthorized users cannot access dashboards for other roles or projects.",
      ],
    };
  }

  if (
    lower.includes("button") ||
    lower.includes("color") ||
    lower.includes("ui") ||
    lower.includes("design") ||
    lower.includes("layout")
  ) {
    return {
      productArea: "User interface / layout / visual design",
      expectedOutcome:
        "The requested UI change should improve the visual experience while keeping the existing product flow stable.",
      owner:
        "Frontend Developer should implement the visual change. Product Manager should confirm exact UI behavior and acceptance rules.",
      impact:
        "This may affect component styling, layout spacing, responsiveness, and consistency with the existing design system.",
      questions: [
        "Which page or component should be changed?",
        "What exact visual result should the client see after the change?",
        "Should this change apply globally or only to one page?",
      ],
      criteria: [
        "The requested UI change is visible in the correct area.",
        "The change matches the existing design language.",
        "The UI remains responsive and usable.",
      ],
    };
  }

  return {
    productArea: `${type} request area needs confirmation`,
    expectedOutcome:
      "The requested change should be clarified and converted into a specific implementation-ready requirement.",
    owner:
      "Product Manager should clarify missing requirements first. Senior Engineer can review technical scope after clarification.",
    impact:
      "Impact depends on the exact product area, user flow, and expected behavior confirmed by the client.",
    questions: [
      "Which exact page, feature, or workflow should this request affect?",
      "Who is the main user affected by this request?",
      "What should happen after the change is completed?",
    ],
    criteria: [
      "The request has a clearly defined affected area.",
      "The expected behavior is clear.",
      "The product team can convert the request into a PRD without ambiguity.",
    ],
  };
}

function safeJsonParse(value: string): AiDraft | null {
  try {
    const cleaned = value
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      return null;
    }

    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as AiDraft;
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
  const requestContext = getRequestSpecificContext(message, type);

  const safeAffectedAreas =
    affectedAreas.length > 0 ? affectedAreas : [requestContext.productArea];

  return {
    title: cleanTitle(message, type),
    type,
    priority: getPriority(message),

    shouldProceed: true,
    needsMoreContext: true,
    alreadyExists: false,

    businessProblem:
      "The business value should be confirmed by the client before this request moves into final PRD approval.",

    problem: `Client requested: ${message}`,

    expectedOutcome: requestContext.expectedOutcome,

    whoWillUseIt:
      "The affected user role needs confirmation from the client before final PRD generation.",

    whoShouldResolve: requestContext.owner,

    missingQuestions: requestContext.questions,

    acceptanceCriteria: requestContext.criteria,

    duplicateRisk:
      "No exact duplicate could be confirmed from the available repository context. Product Manager should still verify whether similar functionality already exists.",

    repositoryContext: [
      `Repository: ${repoFullName || "Not connected"}`,
      `Tech stack: ${techStack || "Not detected"}`,
      `Repository summary: ${repoSummary}`,
      `Request-specific product area: ${requestContext.productArea}`,
    ].join("\n"),

    repoUnderstanding: `Loom reviewed the connected repository context for this request and mapped it to: ${requestContext.productArea}.`,

    existingFunctionalityCheck:
      "Loom could not fully confirm whether this exact behavior already exists from the available fallback analysis.",

    requiredFiles: safeAffectedAreas,

    changeImpact: requestContext.impact,

    affectedAreas: safeAffectedAreas,

    additionalInformationNeeded: requestContext.questions,

    prdReadiness: "NEEDS_MORE_CONTEXT",

    clientEducation:
      "If this capability already exists in the product, the request may only require training, documentation, or a smaller UI improvement instead of a new feature build.",
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

Project:
${projectName}

Repository:
${repoFullName}

Default branch:
${defaultBranch}

GitHub description:
${repoDescription || "No GitHub description."}

Detected tech stack:
${techStack || "Not detected"}

Repository summary:
${repoSummary}

Relevant repository file context:
${fileContext}

IMPORTANT BEHAVIOR RULES:
- Every field must be specific to this exact client request.
- Do not reuse generic sentences.
- Do not say "this request may require updates" unless you explain what area and why.
- Do not always say Product Manager should verify unless there is a real reason.
- If the request is about logo, talk about logo, branding, header/auth/dashboard usage.
- If the request is about images, talk about landing page image placement, quantity, responsiveness, assets, and layout.
- If the request is about authentication, talk about login, roles, sessions, dashboard redirect, and access.
- If the request is about UI, talk about exact UI area, layout, component, visual behavior, and responsive impact.
- Use only files from the provided repository context.
- Ask follow-up questions only if needed for implementation.
- If the feature already exists, educate the client instead of creating unnecessary work.
- If it does not exist, prepare a clear request draft for PRD generation.

Return only valid JSON with this exact structure:
{
  "title": "specific request title",
  "type": "FEATURE | BUG | CHANGE | IMPROVEMENT | NEW_PRODUCT | OTHER",
  "priority": "LOW | MEDIUM | HIGH | URGENT",
  "shouldProceed": true,
  "needsMoreContext": false,
  "alreadyExists": false,
  "duplicateRisk": "LOW | MEDIUM | HIGH",
  "businessProblem": "specific business problem for this request",
  "problem": "specific problem statement based on the client request",
  "expectedOutcome": "specific expected result after this request is completed",
  "whoWillUseIt": "specific user or role affected",
  "whoShouldResolve": "specific responsible role/team",
  "repositoryContext": "client-safe repository understanding specific to this request",
  "repoUnderstanding": "what Loom understood from the repo for this request",
  "existingFunctionalityCheck": "whether similar functionality exists and where",
  "requiredFiles": ["only files or areas from provided context"],
  "affectedAreas": ["only request-specific affected areas"],
  "changeImpact": "specific product impact for this request",
  "missingQuestions": ["specific follow-up question"],
  "acceptanceCriteria": ["specific acceptance criterion"],
  "additionalInformationNeeded": ["specific missing detail"],
  "prdReadiness": "READY | NEEDS_MORE_CONTEXT | DO_NOT_BUILD | ALREADY_EXISTS",
  "clientEducation": "education message only if client may be confused, otherwise empty string"
}
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





