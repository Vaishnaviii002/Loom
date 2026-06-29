import { auth } from "@/lib/auth";
import { getRepositoryContextForRequest } from "@/lib/github-repo-context";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type GeneratedPrd = {
  title: string;
  problemStatement: string;
  requestedChange: string;
  changeImpact: string;
  acceptanceCriteria: string[];
  edgeCases: string[];
  successMetrics: string[];
};

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

function safeJsonParse(value: string): GeneratedPrd | null {
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

    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as GeneratedPrd;
  } catch {
    return null;
  }
}

function extractSection(rawDescription: string, heading: string) {
  const marker = `${heading}:\n`;
  const start = rawDescription.indexOf(marker);

  if (start === -1) {
    return "";
  }

  const bodyStart = start + marker.length;
  const nextSection = rawDescription.indexOf("\n\n", bodyStart);

  if (nextSection === -1) {
    return rawDescription.slice(bodyStart).trim();
  }

  return rawDescription.slice(bodyStart, nextSection).trim();
}

function getRequestSpecificFallbackPrd({
  title,
  rawDescription,
}: {
  title: string;
  rawDescription: string;
}): GeneratedPrd {
  const originalMessage =
    extractSection(rawDescription, "Original client message") ||
    extractSection(rawDescription, "Problem") ||
    title;

  const lower = `${title} ${originalMessage}`.toLowerCase();

  if (lower.includes("logo") || lower.includes("brand")) {
    return {
      title,
      problemStatement: `The client wants the product logo or branding updated. Request: ${originalMessage}`,
      requestedChange:
        "Update the visible logo/branding in the requested product area while keeping spacing, responsiveness, and visual consistency intact.",
      changeImpact:
        "This change affects brand presentation and may impact the header, landing page, auth screens, or dashboard areas where the logo is shown.",
      acceptanceCriteria: [
        "The correct logo is visible in the requested area.",
        "The logo keeps proper size, spacing, and alignment.",
        "The update works on desktop and mobile screens.",
      ],
      edgeCases: [
        "Logo may need different sizing for small screens.",
        "If the app uses logo in multiple layouts, all required locations must be confirmed.",
      ],
      successMetrics: [
        "Client can visually confirm the logo update.",
        "No layout or navigation area breaks after the change.",
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
      title,
      problemStatement: `The client wants image content added or updated on the landing page. Request: ${originalMessage}`,
      requestedChange:
        "Add the requested image content to the correct landing page section with clean layout, responsive behavior, and visual consistency.",
      changeImpact:
        "This change affects landing page visual hierarchy, image loading, responsiveness, and first impression for visitors.",
      acceptanceCriteria: [
        "Images appear in the correct landing page section.",
        "Minimum/maximum image requirement is followed if provided.",
        "Images remain responsive on desktop and mobile.",
        "The landing page layout does not shift or break.",
      ],
      edgeCases: [
        "Image aspect ratios may differ and need consistent handling.",
        "Large image files may affect page loading speed.",
      ],
      successMetrics: [
        "Client can verify the image placement visually.",
        "Landing page remains clean and usable across screen sizes.",
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
      title,
      problemStatement: `The client reported an authentication or access issue. Request: ${originalMessage}`,
      requestedChange:
        "Fix the login/access flow so the correct user role can authenticate and reach the assigned dashboard or project.",
      changeImpact:
        "This may affect authentication, sessions, role-based redirects, invite acceptance, and project access validation.",
      acceptanceCriteria: [
        "User can sign in with valid credentials.",
        "User redirects to the correct role-based dashboard.",
        "User only sees the assigned project.",
        "Invalid credentials still show a safe error message.",
      ],
      edgeCases: [
        "User may exist in app database but not in auth credentials.",
        "User may have multiple memberships or old invites.",
      ],
      successMetrics: [
        "Affected user can successfully log in.",
        "Role-based dashboard opens correctly after login.",
      ],
    };
  }

  return {
    title,
    problemStatement: `The client submitted a product request. Request: ${originalMessage}`,
    requestedChange:
      "Clarify and implement the requested change in the exact product area affected by the client request.",
    changeImpact:
      "Impact depends on the affected page, component, or workflow. The product team should confirm the exact location before engineering starts.",
    acceptanceCriteria: [
      "The affected product area is clearly identified.",
      "Expected behavior is clear before implementation starts.",
      "Client can verify the completed change.",
    ],
    edgeCases: [
      "The request may need additional client clarification.",
      "The requested behavior may already exist in another part of the product.",
    ],
    successMetrics: [
      "The PRD is specific enough for product review.",
      "Engineering can convert the PRD into scoped tasks.",
    ],
  };
}

function buildPrdContent(prd: GeneratedPrd) {
  return [
    "Problem statement",
    prd.problemStatement,

    "Requested change",
    prd.requestedChange,

    "Change impact",
    prd.changeImpact,

    "Acceptance criteria",
    prd.acceptanceCriteria.map((item) => `- ${item}`).join("\n"),

    "Edge cases",
    prd.edgeCases.map((item) => `- ${item}`).join("\n"),

    "Success metrics",
    prd.successMetrics.map((item) => `- ${item}`).join("\n"),
  ].join("\n\n");
}

async function generatePrdWithOpenAI({
  title,
  rawDescription,
  repoContext,
}: {
  title: string;
  rawDescription: string;
  repoContext: unknown;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.15,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: `
You are Loom PRD Generator.

Generate a short, specific, client-facing PRD only for the exact request provided.

Rules:
- Do not generate generic PRDs.
- Do not reuse the same wording for every request.
- Do not include goals and non-goals.
- Do not create a long PRD.
- Do not expose source code.
- Use repository context only to understand affected files/areas.
- If the request is about logo, write logo-specific PRD.
- If the request is about landing page images, write image/landing-page-specific PRD.
- If the request is about login, write auth/login-specific PRD.
- Keep every field practical, short, and implementation-ready.

Return JSON only:
{
  "title": "specific PRD title",
  "problemStatement": "specific problem based on the client request",
  "requestedChange": "specific change to make",
  "changeImpact": "specific impact on product/user flow",
  "acceptanceCriteria": ["specific criterion"],
  "edgeCases": ["specific edge case"],
  "successMetrics": ["specific success metric"]
}
`,
        },
        {
          role: "user",
          content: `
Request title:
${title}

Saved request details:
${rawDescription}

Repository context:
${JSON.stringify(repoContext, null, 2)}

Generate a concise PRD only for this request.
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

    const projectId = sanitizeText(String(body.projectId ?? ""));
    const requestId = sanitizeText(String(body.requestId ?? ""));

    if (!projectId) {
      return NextResponse.json(
        { error: "Project id is required." },
        { status: 400 },
      );
    }

    if (!requestId) {
      return NextResponse.json(
        { error: "Request id is required." },
        { status: 400 },
      );
    }

    const ticket = await db.featureRequest.findFirst({
      where: {
        id: requestId,
        projectId,
      },
      select: {
        id: true,
        projectId: true,
        clientId: true,
        title: true,
        rawDescription: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Request was not found." },
        { status: 404 },
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

    if (membership.role === "CLIENT") {
      const access = await db.clientProjectAccess.findFirst({
        where: {
          clientId: session.user.id,
          projectId,
        },
      });

      if (!access) {
        return NextResponse.json(
          { error: "You do not have access to this request." },
          { status: 403 },
        );
      }
    }

    if (membership.role === "ADMIN") {
      const projectAccess = await db.project.findFirst({
        where: {
          id: projectId,
          workspaceId: membership.workspaceId,
        },
        select: {
          id: true,
        },
      });

      if (!projectAccess) {
        return NextResponse.json(
          { error: "You do not have access to this project." },
          { status: 403 },
        );
      }
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
      },
      include: {
        gitHubRepo: true,
      },
    });

    const repoFullName = project?.gitHubRepo?.repoFullName ?? "";

    const repoContext = repoFullName
      ? await getRepositoryContextForRequest({
          repoFullName,
          message: `${ticket.title}\n\n${ticket.rawDescription}`,
        })
      : null;

    const aiPrd = await generatePrdWithOpenAI({
      title: ticket.title,
      rawDescription: ticket.rawDescription,
      repoContext,
    });

    const finalPrd =
      aiPrd ??
      getRequestSpecificFallbackPrd({
        title: ticket.title,
        rawDescription: ticket.rawDescription,
      });

    return NextResponse.json({
      ok: true,
      source: aiPrd ? "AI" : "REQUEST_SPECIFIC_FALLBACK",
      prd: {
        id: crypto.randomUUID(),
        requestId: ticket.id,
        title: finalPrd.title || ticket.title,
        status: "GENERATED",
        content: buildPrdContent(finalPrd),
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to generate PRD." },
      { status: 500 },
    );
  }
}