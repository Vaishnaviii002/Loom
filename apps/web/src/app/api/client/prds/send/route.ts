// import { auth } from "@/lib/auth";
// import { db } from "@shipflow/db";
// import { headers } from "next/headers";
// import { NextRequest, NextResponse } from "next/server";

// export const runtime = "nodejs";

// function sanitizeText(value: string) {
//   return value.replace(/\u0000/g, "").trim();
// }

// export async function POST(request: NextRequest) {
//   try {
//     const session = await auth.api.getSession({
//       headers: await headers(),
//     });

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
//     }

//     const body = await request.json();

//     const projectId = sanitizeText(String(body.projectId ?? ""));
//     const requestId = sanitizeText(String(body.requestId ?? ""));
//     const prdId = sanitizeText(String(body.prdId ?? ""));
//     const title = sanitizeText(String(body.title ?? ""));
//     const content = sanitizeText(String(body.content ?? ""));

//     if (!projectId || !requestId || !prdId || !title || !content) {
//       return NextResponse.json(
//         { error: "PRD data is incomplete." },
//         { status: 400 },
//       );
//     }

//     const membership = await db.membership.findFirst({
//       where: {
//         userId: session.user.id,
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });

//     if (!membership) {
//       return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
//     }

//     const isClient = membership.role === "CLIENT";
//     const isAdmin = membership.role === "ADMIN";

//     if (!isClient && !isAdmin) {
//       return NextResponse.json(
//         { error: "Only clients can send PRDs to Product Manager." },
//         { status: 403 },
//       );
//     }

//     const project = await db.project.findFirst({
//       where: isAdmin
//         ? {
//             id: projectId,
//             workspaceId: membership.workspaceId,
//           }
//         : {
//             id: projectId,
//           },
//       include: {
//         gitHubRepo: true,
//       },
//     });

//     if (!project) {
//       return NextResponse.json(
//         { error: "Project not found." },
//         { status: 404 },
//       );
//     }

//     if (isClient) {
//       const access = await db.clientProjectAccess.findFirst({
//         where: {
//           clientId: session.user.id,
//           projectId,
//         },
//       });

//       if (!access) {
//         return NextResponse.json(
//           { error: "You do not have access to this project." },
//           { status: 403 },
//         );
//       }
//     }

//     const ticket = await db.featureRequest.findFirst({
//       where: {
//         id: requestId,
//         projectId,
//       },
//       select: {
//         id: true,
//         title: true,
//       },
//     });

//     if (!ticket) {
//       return NextResponse.json(
//         { error: "Request not found for this project." },
//         { status: 404 },
//       );
//     }

//     await db.auditLog.create({
//       data: {
//         workspaceId: project.workspaceId,
//         actorId: session.user.id,
//         action: "client.prd.sent_to_pm",
//         entityType: "PRD",
//         entityId: prdId,
//         metadata: JSON.stringify({
//           prdId,
//           requestId,
//           projectId,
//           projectName: project.name,
//           repository: project.gitHubRepo?.repoFullName ?? "",
//           title,
//           content,
//           status: "SENT_TO_PM",
//           sentAt: new Date().toISOString(),
//         }),
//       },
//     });

//     return NextResponse.json({
//       ok: true,
//       status: "SENT_TO_PM",
//     });
//   } catch {
//     return NextResponse.json(
//       { error: "Unable to send PRD to Product Manager." },
//       { status: 500 },
//     );
//   }
// }























import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

type SentPrdMetadata = {
  prdId?: string;
  requestId?: string;
  projectId?: string;
  title?: string;
  content?: string;
  status?: string;
  sentAt?: string;
};

function parseMetadata(metadata: unknown): SentPrdMetadata | null {
  try {
    if (typeof metadata === "string") {
      return JSON.parse(metadata) as SentPrdMetadata;
    }

    return JSON.parse(JSON.stringify(metadata ?? {})) as SentPrdMetadata;
  } catch {
    return null;
  }
}

async function getProjectAccess({
  userId,
  projectId,
}: {
  userId: string;
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

  const isClient = membership.role === "CLIENT";
  const isAdmin = membership.role === "ADMIN";

  if (!isClient && !isAdmin) {
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

  if (isClient) {
    const access = await db.clientProjectAccess.findFirst({
      where: {
        clientId: userId,
        projectId,
      },
    });

    if (!access) {
      return null;
    }
  }

  return {
    membership,
    project,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const projectId = sanitizeText(
      String(request.nextUrl.searchParams.get("projectId") ?? ""),
    );

    if (!projectId) {
      return NextResponse.json(
        { error: "Project id is required." },
        { status: 400 },
      );
    }

    const access = await getProjectAccess({
      userId: session.user.id,
      projectId,
    });

    if (!access) {
      return NextResponse.json(
        { error: "You do not have access to this project." },
        { status: 403 },
      );
    }

    const logs = await db.auditLog.findMany({
      where: {
        workspaceId: access.project.workspaceId,
        action: "client.prd.sent_to_pm",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    const sent = logs
      .map((log) => parseMetadata(log.metadata))
      .filter((item) => item?.projectId === projectId);

    return NextResponse.json({
      ok: true,
      sentPrdIds: sent.map((item) => item.prdId).filter(Boolean),
      sentRequestIds: sent.map((item) => item.requestId).filter(Boolean),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load sent PRDs." },
      { status: 500 },
    );
  }
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
    const prdId = sanitizeText(String(body.prdId ?? ""));
    const title = sanitizeText(String(body.title ?? ""));
    const content = sanitizeText(String(body.content ?? ""));

    if (!projectId || !requestId || !prdId || !title || !content) {
      return NextResponse.json(
        { error: "PRD data is incomplete." },
        { status: 400 },
      );
    }

    const access = await getProjectAccess({
      userId: session.user.id,
      projectId,
    });

    if (!access) {
      return NextResponse.json(
        { error: "You do not have access to this project." },
        { status: 403 },
      );
    }

    const ticket = await db.featureRequest.findFirst({
      where: {
        id: requestId,
        projectId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Request not found for this project." },
        { status: 404 },
      );
    }

    const existingLogs = await db.auditLog.findMany({
      where: {
        workspaceId: access.project.workspaceId,
        action: "client.prd.sent_to_pm",
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
        (metadata?.prdId === prdId || metadata?.requestId === requestId)
      );
    });

    if (alreadySent) {
      return NextResponse.json({
        ok: true,
        status: "SENT_TO_PM",
        alreadySent: true,
      });
    }

    await db.auditLog.create({
      data: {
        workspaceId: access.project.workspaceId,
        actorId: session.user.id,
        action: "client.prd.sent_to_pm",
        entityType: "PRD",
        entityId: prdId,
        metadata: JSON.stringify({
          prdId,
          requestId,
          projectId,
          projectName: access.project.name,
          repository: access.project.gitHubRepo?.repoFullName ?? "",
          title,
          content,
          status: "SENT_TO_PM",
          sentAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      status: "SENT_TO_PM",
      alreadySent: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to send PRD to Product Manager." },
      { status: 500 },
    );
  }
}