import { auth } from "@/lib/auth";
import { getRepositoryContextForRequest } from "@/lib/github-repo-context";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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
    problem: message,
    expectedOutcome:
      "The requested change should be reviewed by the product team and converted into a clear implementation-ready requirement.",
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
    changeImpact:
      "This request may require updates in the project UI or product behavior depending on the selected files.",
    affectedAreas,
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
      (file) =>
        `FILE: ${file.path}\n---\n${file.content.slice(0, 6000)}\n---`,
    )
    .join("\n\n");

  const prompt = `
You are Loom AI Discovery Agent.

The client is asking for a product change/feature/bug/update.
You can inspect repository context, but your response must be client-safe.
Do NOT expose full source code.
Do NOT mention internal implementation secrets.
Do NOT invent files that are not in the provided context.
You may mention affected product areas or file paths as "likely areas" only if helpful.

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

Relevant repository files:
${fileContext}

Client request type:
${type}

Client message:
${message}

Return only valid JSON with this exact structure:
{
  "title": "short ticket title",
  "type": "FEATURE | BUG | CHANGE | IMPROVEMENT | NEW_PRODUCT",
  "priority": "LOW | MEDIUM | HIGH",
  "problem": "clear problem statement",
  "expectedOutcome": "what the client expects after the change",
  "missingQuestions": ["question 1", "question 2", "question 3"],
  "acceptanceCriteria": ["criteria 1", "criteria 2", "criteria 3"],
  "duplicateRisk": "whether this may already exist based on repo context",
  "repositoryContext": "short client-safe repo understanding",
  "repoUnderstanding": "what Loom understood from repository files",
  "changeImpact": "which product area is likely affected and why",
  "affectedAreas": ["client-safe area or likely file path 1", "client-safe area or likely file path 2"]
}
`;

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
          content:
            "You generate structured product tickets from client requests using GitHub repository context. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
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

    let project:
      | {
          id: string;
          name: string;
          description: string | null;
          techStack: string | null;
          workspaceId: string;
          gitHubRepo: {
            repoFullName: string;
          } | null;
        }
      | null = null;

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