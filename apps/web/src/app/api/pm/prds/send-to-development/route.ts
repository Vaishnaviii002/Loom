// import { auth } from "@/lib/auth";
// import { db } from "@shipflow/db";
// import { headers } from "next/headers";
// import { NextRequest, NextResponse } from "next/server";

// export const runtime = "nodejs";

// type DevelopmentTask = {
//   id: string;
//   title: string;
//   ownerRole: string;
//   area: string;
//   reason: string;
//   acceptanceCriteria: string[];
//   status: string;
// };

// function sanitizeText(value: string) {
//   return value.replace(/\u0000/g, "").trim();
// }

// function parseMetadata(metadata: unknown) {
//   try {
//     if (typeof metadata === "string") {
//       return JSON.parse(metadata);
//     }

//     return JSON.parse(JSON.stringify(metadata ?? {}));
//   } catch {
//     return null;
//   }
// }

// async function getPmProjectAccess({
//   userId,
//   email,
//   projectId,
// }: {
//   userId: string;
//   email: string;
//   projectId: string;
// }) {
//   const membership = await db.membership.findFirst({
//     where: {
//       userId,
//     },
//     orderBy: {
//       createdAt: "asc",
//     },
//   });

//   if (!membership) {
//     return null;
//   }

//   const isPm = membership.role === "PM";
//   const isAdmin = membership.role === "ADMIN";

//   if (!isPm && !isAdmin) {
//     return null;
//   }

//   const project = await db.project.findFirst({
//     where: isAdmin
//       ? {
//           id: projectId,
//           workspaceId: membership.workspaceId,
//         }
//       : {
//           id: projectId,
//         },
//     include: {
//       gitHubRepo: true,
//     },
//   });

//   if (!project) {
//     return null;
//   }

//   if (isPm) {
//     const acceptedInvite = await db.invite.findFirst({
//       where: {
//         email,
//         role: "PM" as any,
//         status: "ACCEPTED" as any,
//         projectId,
//       },
//       select: {
//         id: true,
//       },
//     });

//     if (!acceptedInvite) {
//       return null;
//     }
//   }

//   return {
//     membership,
//     project,
//   };
// }

// function getAcceptanceCriteria(content: string) {
//   const lower = content.toLowerCase();
//   const marker = "acceptance criteria";
//   const start = lower.indexOf(marker);

//   if (start === -1) {
//     return ["Implementation must satisfy the finalized PRD."];
//   }

//   const after = content.slice(start + marker.length);
//   const nextHeadingMatch = after.match(
//     /\n\s*(edge cases|success metrics|additional client details|pm notes)\b/i,
//   );

//   const criteriaBlock = nextHeadingMatch
//     ? after.slice(0, nextHeadingMatch.index)
//     : after;

//   const items = criteriaBlock
//     .split("\n")
//     .map((line) => line.replace(/^[-•]\s*/, "").trim())
//     .filter(Boolean);

//   return items.length > 0
//     ? items
//     : ["Implementation must satisfy the finalized PRD."];
// }

// function createTask({
//   title,
//   ownerRole,
//   area,
//   reason,
//   acceptanceCriteria,
// }: {
//   title: string;
//   ownerRole: string;
//   area: string;
//   reason: string;
//   acceptanceCriteria: string[];
// }): DevelopmentTask {
//   return {
//     id: crypto.randomUUID(),
//     title,
//     ownerRole,
//     area,
//     reason,
//     acceptanceCriteria,
//     status: "ASSIGNED",
//   };
// }

// function generateDevelopmentTasks({
//   title,
//   finalContent,
// }: {
//   title: string;
//   finalContent: string;
// }) {
//   const lower = `${title}\n${finalContent}`.toLowerCase();
//   const acceptanceCriteria = getAcceptanceCriteria(finalContent);
//   const tasks: DevelopmentTask[] = [];

//   if (
//     lower.includes("logo") ||
//     lower.includes("brand") ||
//     lower.includes("header")
//   ) {
//     tasks.push(
//       createTask({
//         title: `Update branding for ${title}`,
//         ownerRole: "FRONTEND_DEVELOPER",
//         area: "Logo / branding / visible UI",
//         reason:
//           "The finalized PRD requires a visible logo or branding update.",
//         acceptanceCriteria,
//       }),
//     );
//   }

//   if (
//     lower.includes("image") ||
//     lower.includes("picture") ||
//     lower.includes("landing") ||
//     lower.includes("hero") ||
//     lower.includes("layout") ||
//     lower.includes("responsive") ||
//     lower.includes("button") ||
//     lower.includes("color") ||
//     lower.includes("ui")
//   ) {
//     tasks.push(
//       createTask({
//         title: `Implement UI changes for ${title}`,
//         ownerRole: "FRONTEND_DEVELOPER",
//         area: "Frontend UI / responsive layout",
//         reason:
//           "The finalized PRD includes visual or layout work that must be implemented in the product UI.",
//         acceptanceCriteria,
//       }),
//     );
//   }

//   if (
//     lower.includes("api") ||
//     lower.includes("database") ||
//     lower.includes("auth") ||
//     lower.includes("login") ||
//     lower.includes("sign in") ||
//     lower.includes("password") ||
//     lower.includes("session") ||
//     lower.includes("backend") ||
//     lower.includes("server") ||
//     lower.includes("route")
//   ) {
//     tasks.push(
//       createTask({
//         title: `Implement backend changes for ${title}`,
//         ownerRole: "BACKEND_DEVELOPER",
//         area: "Backend / API / auth / database",
//         reason:
//           "The finalized PRD includes backend, authentication, API, route, or data workflow work.",
//         acceptanceCriteria,
//       }),
//     );
//   }

//   if (
//     lower.includes("performance") ||
//     lower.includes("optimize") ||
//     lower.includes("optimization") ||
//     lower.includes("security") ||
//     lower.includes("architecture") ||
//     lower.includes("refactor") ||
//     lower.includes("slow") ||
//     lower.includes("scalable")
//   ) {
//     tasks.push(
//       createTask({
//         title: `Technical review for ${title}`,
//         ownerRole: "SENIOR_DEVELOPER",
//         area: "Architecture / optimization / technical quality",
//         reason:
//           "The finalized PRD includes technical quality, performance, scalability, or security concerns.",
//         acceptanceCriteria,
//       }),
//     );
//   }

//   tasks.push(
//     createTask({
//       title: `Verify delivery for ${title}`,
//       ownerRole: "QA_REVIEWER",
//       area: "QA verification",
//       reason:
//         "Every finalized PRD must be verified against acceptance criteria before completion.",
//       acceptanceCriteria,
//     }),
//   );

//   if (tasks.length === 1) {
//     tasks.unshift(
//       createTask({
//         title: `Review and implement ${title}`,
//         ownerRole: "SENIOR_DEVELOPER",
//         area: "Implementation ownership review",
//         reason:
//           "The PRD needs engineering ownership assignment before implementation.",
//         acceptanceCriteria,
//       }),
//     );
//   }

//   return tasks;
// }

// export async function POST(request: NextRequest) {
//   try {
//     const session = await auth.api.getSession({
//       headers: await headers(),
//     });

//     if (!session?.user?.id || !session.user.email) {
//       return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
//     }

//     const body = await request.json();

//     const projectId = sanitizeText(String(body.projectId ?? ""));
//     const prdId = sanitizeText(String(body.prdId ?? ""));
//     const requestId = sanitizeText(String(body.requestId ?? ""));
//     const title = sanitizeText(String(body.title ?? ""));
//     const finalContent = sanitizeText(String(body.finalContent ?? ""));
//     const tasks = Array.isArray(body.tasks) ? body.tasks : [];

//     if (!projectId || !prdId || !requestId || !title || !finalContent) {
//       return NextResponse.json(
//         { error: "Final PRD data is incomplete." },
//         { status: 400 },
//       );
//     }

//     const access = await getPmProjectAccess({
//       userId: session.user.id,
//       email: session.user.email,
//       projectId,
//     });

//     if (!access) {
//       return NextResponse.json(
//         { error: "You do not have access to this project." },
//         { status: 403 },
//       );
//     }

//     const existingLogs = await db.auditLog.findMany({
//       where: {
//         workspaceId: access.project.workspaceId,
//         action: "pm.prd.sent_to_development",
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//       take: 200,
//     });

//     const alreadySent = existingLogs.some((log) => {
//       const metadata = parseMetadata(log.metadata);

//       return (
//         metadata?.projectId === projectId &&
//         metadata?.prdId === prdId &&
//         metadata?.requestId === requestId
//       );
//     });

//     if (alreadySent) {
//       return NextResponse.json({
//         ok: true,
//         status: "SENT_TO_DEVELOPMENT",
//         alreadySent: true,
//       });
//     }

//     const developmentTasks =
//   tasks.length > 0
//     ? tasks
//     : generateDevelopmentTasks({
//         title,
//         finalContent,
//       });

//     await db.auditLog.create({
//       data: {
//         workspaceId: access.project.workspaceId,
//         actorId: session.user.id,
//         action: "pm.prd.sent_to_development",
//         entityType: "DevelopmentTaskBatch",
//         entityId: prdId,
//         metadata: JSON.stringify({
//           prdId,
//           requestId,
//           projectId,
//           projectName: access.project.name,
//           repository: access.project.gitHubRepo?.repoFullName ?? "",
//           title,
//           finalContent,
//           status: "SENT_TO_DEVELOPMENT",
//           tasks: developmentTasks,
//           createdAt: new Date().toISOString(),
//         }),
//       },
//     });

//     return NextResponse.json({
//       ok: true,
//       status: "SENT_TO_DEVELOPMENT",
//       tasks: developmentTasks,
//     });
//   } catch {
//     return NextResponse.json(
//       { error: "Unable to convert PRD into development tasks." },
//       { status: 500 },
//     );
//   }
// }






















import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type DevelopmentTask = {
  id: string;
  title: string;
  ownerRole: string;
  summary: string;
  workItems: string[];
  affectedFiles: string[];
  status: string;
};

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

function sanitizeArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeText(String(item ?? "")))
    .filter(Boolean);
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

function normalizeTask(value: unknown): DevelopmentTask | null {
  const item = value as Partial<DevelopmentTask> | null;

  if (!item || typeof item !== "object") {
    return null;
  }

  const title = sanitizeText(String(item.title ?? ""));
  const ownerRole = sanitizeText(String(item.ownerRole ?? ""));

  if (!title || !ownerRole) {
    return null;
  }

  return {
    id: sanitizeText(String(item.id ?? "")) || crypto.randomUUID(),
    title,
    ownerRole,
    summary: sanitizeText(String(item.summary ?? "")),
    workItems: sanitizeArray(item.workItems),
    affectedFiles: sanitizeArray(item.affectedFiles),
    status: sanitizeText(String(item.status ?? "READY_FOR_DEVELOPER")),
  };
}

function normalizeTasks(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const tasks = value
    .map((item) => normalizeTask(item))
    .filter((task): task is DevelopmentTask => Boolean(task));

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

function fallbackDevelopmentTask({
  title,
  finalContent,
}: {
  title: string;
  finalContent: string;
}): DevelopmentTask {
  return {
    id: crypto.randomUUID(),
    title: `Analyze and implement ${title}`,
    ownerRole: "SENIOR_DEVELOPER",
    summary:
      "This task was created as a fallback because no AI-generated task list was provided.",
    workItems: [
      "Read the finalized PRD.",
      "Identify the correct implementation owner.",
      "Break the PRD into developer-specific work before implementation.",
      "Implement only what is required by the finalized PRD.",
      finalContent.slice(0, 300),
    ].filter(Boolean),
    affectedFiles: [],
    status: "READY_FOR_DEVELOPER",
  };
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
    const submittedTasks = normalizeTasks(body.tasks);

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

    const existingLogs = await db.auditLog.findMany({
      where: {
        workspaceId: access.project.workspaceId,
        action: "pm.prd.sent_to_development",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    const alreadySent = existingLogs.some((log) => {
      const metadata = parseMetadata(log.metadata);

      return (
        metadata?.projectId === projectId &&
        metadata?.prdId === prdId &&
        metadata?.requestId === requestId
      );
    });

    if (alreadySent) {
      return NextResponse.json({
        ok: true,
        status: "SENT_TO_DEVELOPMENT",
        alreadySent: true,
      });
    }

    const developmentTasks =
      submittedTasks.length > 0
        ? submittedTasks
        : [
            fallbackDevelopmentTask({
              title,
              finalContent,
            }),
          ];

    await db.auditLog.create({
      data: {
        workspaceId: access.project.workspaceId,
        actorId: session.user.id,
        action: "pm.prd.sent_to_development",
        entityType: "DevelopmentTaskBatch",
        entityId: prdId,
        metadata: JSON.stringify({
          prdId,
          requestId,
          projectId,
          projectName: access.project.name,
          repository: access.project.gitHubRepo?.repoFullName ?? "",
          title,
          finalContent,
          status: "SENT_TO_DEVELOPMENT",
          tasks: developmentTasks,
          createdAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      status: "SENT_TO_DEVELOPMENT",
      tasks: developmentTasks,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to send development tasks." },
      { status: 500 },
    );
  }
}