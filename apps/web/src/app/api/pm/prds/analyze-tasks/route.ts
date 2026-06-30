import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type OwnerRole =
  | "UI_DESIGNER"
  | "FRONTEND_DEVELOPER"
  | "BACKEND_DEVELOPER"
  | "SENIOR_DEVELOPER"
  | "QA_REVIEWER";

type DevelopmentTask = {
  id: string;
  title: string;
  ownerRole: OwnerRole;
  summary: string;
  workItems: string[];
  affectedFiles: string[];
  status: "READY_FOR_DEVELOPER";
};

type AiGeneratedTask = {
  title?: string;
  ownerRole?: string;
  summary?: string;
  workItems?: string[];
  affectedFiles?: string[];
};

type AiTaskResponse = {
  tasks?: AiGeneratedTask[];
};

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

function normalizeArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeText(String(item ?? "")))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeOwnerRole(value: unknown): OwnerRole {
  const role = sanitizeText(String(value ?? "")).toUpperCase();

  if (
    role === "UI_DESIGNER" ||
    role === "FRONTEND_DEVELOPER" ||
    role === "BACKEND_DEVELOPER" ||
    role === "SENIOR_DEVELOPER" ||
    role === "QA_REVIEWER"
  ) {
    return role;
  }

  return "SENIOR_DEVELOPER";
}

function parseMetadata(metadata: unknown) {
  try {
    if (typeof metadata === "string") {
      return JSON.parse(metadata);
    }

    return JSON.parse(JSON.stringify(metadata ?? {}));
  } catch {
    return null;
  }
}

async function getPmProjectAccess({
  userId,
  email,
  projectId,
}: {
  userId: string;
  email: string;
  projectId: string;
}) {
  const membership = await db.membership.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    return null;
  }

  const isPm = membership.role === "PM";
  const isAdmin = membership.role === "ADMIN";

  if (!isPm && !isAdmin) {
    return null;
  }

  const project = await db.project.findFirst({
    where: isAdmin
      ? {
          id: projectId,
          workspaceId: membership.workspaceId,
        }
      : {
          id: projectId,
        },
    include: {
      gitHubRepo: true,
    },
  });

  if (!project) {
    return null;
  }

  if (isPm) {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email,
        role: "PM" as any,
        status: "ACCEPTED" as any,
        projectId,
      },
      select: {
        id: true,
      },
    });

    if (!acceptedInvite) {
      return null;
    }
  }

  return {
    membership,
    project,
  };
}

function getSection(content: string, heading: string) {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) =>
    line.trim().toLowerCase().startsWith(heading.toLowerCase()),
  );

  if (startIndex === -1) {
    return "";
  }

  const collected: string[] = [];
  const knownHeadings = [
    "problem statement",
    "requested change",
    "change impact",
    "acceptance criteria",
    "edge cases",
    "success metrics",
    "additional client details",
  ];

  const firstLine = lines[startIndex].trim();
  const inlineDashIndex = firstLine.indexOf(" - ");

  if (inlineDashIndex !== -1) {
    collected.push(firstLine.slice(inlineDashIndex + 3).trim());
  }

  for (let index = startIndex + 1; index < lines.length; index++) {
    const line = lines[index].trim();
    const lowerLine = line.toLowerCase();

    const isNextHeading = knownHeadings.some((knownHeading) =>
      lowerLine.startsWith(knownHeading),
    );

    if (isNextHeading) {
      break;
    }

    if (line) {
      collected.push(line);
    }
  }

  return collected.join("\n").trim();
}

function getPrimaryIntentText({
  title,
  finalContent,
}: {
  title: string;
  finalContent: string;
}) {
  const problem = getSection(finalContent, "Problem statement");
  const requestedChange = getSection(finalContent, "Requested change");
  const additional = getSection(finalContent, "Additional client details");

  return [title, problem, requestedChange, additional]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function extractAcceptancePoints(finalContent: string) {
  const acceptance = getSection(finalContent, "Acceptance criteria");

  const points = acceptance
    .split("\n")
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);

  return points.length > 0
    ? points.slice(0, 5)
    : ["The completed work must match the finalized PRD."];
}

function createTask({
  title,
  ownerRole,
  summary,
  workItems,
  affectedFiles = [],
}: {
  title: string;
  ownerRole: OwnerRole;
  summary: string;
  workItems: string[];
  affectedFiles?: string[];
}): DevelopmentTask {
  return {
    id: crypto.randomUUID(),
    title,
    ownerRole,
    summary,
    workItems: workItems.filter(Boolean).slice(0, 8),
    affectedFiles,
    status: "READY_FOR_DEVELOPER",
  };
}

function dedupeTasks(tasks: DevelopmentTask[]) {
  const seen = new Set<string>();

  return tasks.filter((task) => {
    const key = `${task.ownerRole}:${task.title.toLowerCase()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function fallbackAnalyzePrd({
  title,
  finalContent,
}: {
  title: string;
  finalContent: string;
}) {
  const intent = getPrimaryIntentText({
    title,
    finalContent,
  });

  const fullText = `${title}\n${finalContent}`.toLowerCase();
  const acceptancePoints = extractAcceptancePoints(finalContent);
  const tasks: DevelopmentTask[] = [];

  const isLogoWork =
    intent.includes("logo") ||
    intent.includes("brand") ||
    intent.includes("branding");

  const isVisualWork =
    intent.includes("image") ||
    intent.includes("picture") ||
    intent.includes("landing") ||
    intent.includes("hero") ||
    intent.includes("layout") ||
    intent.includes("responsive") ||
    intent.includes("ui") ||
    intent.includes("screen") ||
    intent.includes("page") ||
    intent.includes("button") ||
    intent.includes("color") ||
    intent.includes("theme");

  const isBackendWork =
    intent.includes("api") ||
    intent.includes("database") ||
    intent.includes("auth api") ||
    intent.includes("login issue") ||
    intent.includes("sign in issue") ||
    intent.includes("session") ||
    intent.includes("password") ||
    intent.includes("server") ||
    intent.includes("backend") ||
    intent.includes("route handler");

  const isSeniorWork =
    intent.includes("performance") ||
    intent.includes("optimize") ||
    intent.includes("optimization") ||
    intent.includes("security") ||
    intent.includes("architecture") ||
    intent.includes("refactor") ||
    intent.includes("slow");

  if (isLogoWork) {
    tasks.push(
      createTask({
        title: `Prepare logo update for ${title}`,
        ownerRole: "UI_DESIGNER",
        summary:
          "This task is for the UI Designer because the PRD is focused on logo or brand presentation.",
        workItems: [
          "Review the current logo usage in the product area mentioned in the PRD.",
          "Prepare the updated logo direction according to the PRD requirements.",
          "Make sure the logo works with the existing dark theme and brand style.",
          "Define correct size, spacing, placement, and responsive behavior.",
          ...acceptancePoints,
        ],
      }),
    );

    if (
      fullText.includes("component") ||
      fullText.includes("code") ||
      fullText.includes("src/") ||
      fullText.includes(".tsx") ||
      fullText.includes(".jsx") ||
      fullText.includes("implement") ||
      fullText.includes("visible")
    ) {
      tasks.push(
        createTask({
          title: `Implement logo update for ${title}`,
          ownerRole: "FRONTEND_DEVELOPER",
          summary:
            "This task is for the Frontend Developer because the approved logo change must be applied in the product UI.",
          workItems: [
            "Locate the exact UI component or page where the logo is shown.",
            "Apply the approved logo update without changing unrelated UI areas.",
            "Keep dark-theme styling, spacing, and responsive layout intact.",
            "Verify the logo is visible in the requested area on desktop and mobile.",
            ...acceptancePoints,
          ],
        }),
      );
    }

    return dedupeTasks(tasks);
  }

  if (isVisualWork) {
    tasks.push(
      createTask({
        title: `Implement UI change for ${title}`,
        ownerRole: "FRONTEND_DEVELOPER",
        summary:
          "This task is for the Frontend Developer because the PRD requires a visible UI or layout change.",
        workItems: [
          "Identify the exact page, component, or section mentioned in the PRD.",
          "Implement only the requested UI change.",
          "Keep the existing layout, theme, and responsive behavior consistent.",
          "Verify the change on desktop and mobile screens.",
          ...acceptancePoints,
        ],
      }),
    );
  }

  if (isBackendWork) {
    tasks.push(
      createTask({
        title: `Implement backend workflow for ${title}`,
        ownerRole: "BACKEND_DEVELOPER",
        summary:
          "This task is for the Backend Developer because the PRD explicitly mentions backend, auth, API, session, route, or database behavior.",
        workItems: [
          "Identify the backend route, API, auth, or database logic affected by the PRD.",
          "Implement the required behavior with validation and role/project access control.",
          "Prevent unrelated users, roles, or projects from accessing this workflow.",
          "Test the complete expected behavior from request to result.",
          ...acceptancePoints,
        ],
      }),
    );
  }

  if (isSeniorWork) {
    tasks.push(
      createTask({
        title: `Review technical approach for ${title}`,
        ownerRole: "SENIOR_DEVELOPER",
        summary:
          "This task is for the Senior Developer because the PRD mentions performance, security, architecture, optimization, or refactor work.",
        workItems: [
          "Review the technical risk before implementation starts.",
          "Define the safest implementation approach.",
          "Check regression risk, maintainability, performance, and security impact.",
          ...acceptancePoints,
        ],
      }),
    );
  }

  if (tasks.length === 0) {
    tasks.push(
      createTask({
        title: `Analyze implementation scope for ${title}`,
        ownerRole: "SENIOR_DEVELOPER",
        summary:
          "This task is for the Senior Developer because the PRD does not clearly map to a specific role.",
        workItems: [
          "Read the finalized PRD carefully.",
          "Identify the actual product area affected by the request.",
          "Decide whether the task should be handled by UI, frontend, backend, or senior engineering.",
          "Break it into implementation tasks only after the scope is clear.",
          ...acceptancePoints,
        ],
      }),
    );
  }

  return dedupeTasks(tasks);
}

function normalizeAiTasks({
  tasks,
  title,
}: {
  tasks: AiGeneratedTask[];
  title: string;
}) {
  const normalizedTasks = tasks
    .map((task) => {
      const taskTitle = sanitizeText(String(task?.title ?? ""));

      if (!taskTitle) {
        return null;
      }

      const workItems = normalizeArray(task?.workItems);

      return {
        id: crypto.randomUUID(),
        title: taskTitle,
        ownerRole: normalizeOwnerRole(task?.ownerRole),
        summary:
          sanitizeText(String(task?.summary ?? "")) ||
          `This task is required to complete ${title}.`,
        workItems:
          workItems.length > 0
            ? workItems
            : ["Read the finalized PRD and complete only the required work."],
        affectedFiles: normalizeArray(task?.affectedFiles),
        status: "READY_FOR_DEVELOPER" as const,
      };
    })
    .filter((task): task is DevelopmentTask => Boolean(task));

  return dedupeTasks(normalizedTasks);
}

async function analyzeWithOpenAI({
  title,
  finalContent,
  repository,
}: {
  title: string;
  finalContent: string;
  repository: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const primaryIntent = getPrimaryIntentText({
    title,
    finalContent,
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "You are an enterprise product engineering planner. First understand the actual intent of the finalized PRD. Then create only the development tasks that are actually required. Do not assign backend just because the PRD mentions auth screens as a possible impact. Do not create QA by default. Do not create duplicate frontend and design tasks unless both are truly needed. Return strict JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Analyze the PRD like a real senior product manager. Use primaryIntent as the source of truth for what the request actually asks. Ignore incidental words from change impact unless they are directly requested. Create only necessary tasks. For logo/branding changes, prefer UI_DESIGNER first; add FRONTEND_DEVELOPER only if implementation in product UI is clearly required. Backend task is allowed only if the requested change is about backend/API/auth/database/session behavior. Each task must have direct actionable points. Do not use generic headings like area/reason/implementation in the content.",
            allowedOwnerRoles: [
              "UI_DESIGNER",
              "FRONTEND_DEVELOPER",
              "BACKEND_DEVELOPER",
              "SENIOR_DEVELOPER",
              "QA_REVIEWER",
            ],
            requiredJsonShape: {
              tasks: [
                {
                  title: "short specific task title",
                  ownerRole: "one allowed role",
                  summary: "why this developer role is responsible",
                  workItems: [
                    "specific actionable point",
                    "specific actionable point",
                    "specific actionable point",
                  ],
                  affectedFiles: [
                    "only if clearly known, otherwise empty array",
                  ],
                },
              ],
            },
            repository,
            title,
            primaryIntent,
            finalContent,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as AiTaskResponse;

    if (!Array.isArray(parsed.tasks)) {
      return null;
    }

    return parsed.tasks;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const projectId = sanitizeText(String(body.projectId ?? ""));
    const prdId = sanitizeText(String(body.prdId ?? ""));
    const requestId = sanitizeText(String(body.requestId ?? ""));
    const title = sanitizeText(String(body.title ?? ""));
    const finalContent = sanitizeText(String(body.finalContent ?? ""));

    if (!projectId || !prdId || !requestId || !title || !finalContent) {
      return NextResponse.json(
        { error: "Final PRD data is incomplete." },
        { status: 400 },
      );
    }

    const access = await getPmProjectAccess({
      userId: session.user.id,
      email: session.user.email,
      projectId,
    });

    if (!access) {
      return NextResponse.json(
        { error: "You do not have access to this project." },
        { status: 403 },
      );
    }

    const repository = access.project.gitHubRepo?.repoFullName ?? "";

    const aiTasks = await analyzeWithOpenAI({
      title,
      finalContent,
      repository,
    });

    const tasks =
      aiTasks && aiTasks.length > 0
        ? normalizeAiTasks({
            tasks: aiTasks,
            title,
          })
        : fallbackAnalyzePrd({
            title,
            finalContent,
          });

    await db.auditLog.create({
      data: {
        workspaceId: access.project.workspaceId,
        actorId: session.user.id,
        action: "pm.prd.tasks_analyzed",
        entityType: "DevelopmentTaskDraft",
        entityId: prdId,
        metadata: JSON.stringify({
          prdId,
          requestId,
          projectId,
          projectName: access.project.name,
          repository,
          title,
          finalContent,
          status: "TASKS_ANALYZED",
          tasks,
          createdAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      status: "TASKS_ANALYZED",
      tasks,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to analyze PRD into development tasks." },
      { status: 500 },
    );
  }
}