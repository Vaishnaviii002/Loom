// import { auth } from "@/lib/auth";
// import { db } from "@shipflow/db";
// import { headers } from "next/headers";
// import { redirect } from "next/navigation";
// import DeveloperReviewClient from "./dev-review-client";

// export const dynamic = "force-dynamic";

// type PageProps = {
//   searchParams: Promise<{
//     projectId?: string;
//   }>;
// };

// type DevelopmentTask = {
//   id: string;
//   title: string;
//   ownerRole: string;
//   summary?: string;
//   workItems?: string[];
//   affectedFiles?: string[];
//   area?: string;
//   reason?: string;
//   acceptanceCriteria?: string[];
//   status: string;
// };

// type DevelopmentBatch = {
//   id: string;
//   prdId: string;
//   requestId: string;
//   projectId: string;
//   projectName: string;
//   repository: string;
//   title: string;
//   finalContent: string;
//   status: string;
//   tasks: DevelopmentTask[];
//   createdAt: string;
//   latestReview?: LatestReview | null;
// };

// type ReviewIssue = {
//   severity: "BLOCKING" | "NON_BLOCKING";
//   file?: string;
//   issue: string;
//   recommendation: string;
// };

// type LatestReview = {
//   projectId?: string;
//   requestId?: string;
//   prdId?: string;
//   repository?: string;
//   pullNumber?: number;
//   pullRequestUrl?: string;
//   pullRequestTitle?: string;
//   pullRequestState?: string;
//   changedFiles?: {
//     filename: string;
//     status: string;
//     additions: number;
//     deletions: number;
//     changes: number;
//   }[];
//   review?: {
//     status: "FIX_REQUIRED" | "AI_APPROVED";
//     summary: string;
//     issues: ReviewIssue[];
//   };
//   status?: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
//   createdAt?: string;
// };

// function safeString(value: unknown) {
//   if (typeof value !== "string") return "";
//   return value.trim();
// }

// function parseMetadata<T>(metadata: unknown): T | null {
//   try {
//     if (!metadata) return null;

//     const parsed =
//       typeof metadata === "string"
//         ? JSON.parse(metadata)
//         : JSON.parse(JSON.stringify(metadata));

//     if (!parsed || typeof parsed !== "object") {
//       return null;
//     }

//     return parsed as T;
//   } catch {
//     return null;
//   }
// }

// function reviewKey({
//   projectId,
//   requestId,
//   prdId,
// }: {
//   projectId?: string;
//   requestId?: string;
//   prdId?: string;
// }) {
//   return `${projectId || ""}:${requestId || ""}:${prdId || ""}`;
// }

// export default async function DeveloperPage({ searchParams }: PageProps) {
//   const session = await auth.api.getSession({
//     headers: await headers(),
//   });

//   if (!session?.user?.id || !session.user.email) {
//     redirect("/auth/sign-in");
//   }

//   const params = await searchParams;
//   let projectId = String(params.projectId ?? "").trim();

//   const membership = await db.membership.findFirst({
//     where: {
//       userId: session.user.id,
//     },
//     orderBy: {
//       createdAt: "asc",
//     },
//   });

//   if (!membership) {
//     redirect("/auth/sign-in");
//   }

//   const isDeveloper = membership.role === "DEVELOPER";
//   const isAdmin = membership.role === "ADMIN";

//   if (!isDeveloper && !isAdmin) {
//     redirect("/auth/redirect");
//   }

//   if (isDeveloper && !projectId) {
//   const projectMember = await db.clientProjectMember.findFirst({
//     where: {
//       userId: session.user.id,
//       role: "DEVELOPER",
//     },
//     orderBy: {
//       createdAt: "asc",
//     },
//     select: {
//       projectId: true,
//     },
//   });

//   if (projectMember?.projectId) {
//     projectId = projectMember.projectId;
//   }
// }

// if (isDeveloper && !projectId) {
//   const acceptedInvite = await db.invite.findFirst({
//     where: {
//       email: session.user.email,
//       role: "DEVELOPER",
//       status: "ACCEPTED",
//       projectId: {
//         not: null,
//       },
//     },
//     orderBy: {
//       acceptedAt: "desc",
//     },
//     select: {
//       projectId: true,
//     },
//   });

//   if (acceptedInvite?.projectId) {
//     projectId = acceptedInvite.projectId;
//   }
// }

// if (isDeveloper && !projectId) {
//   const sentTaskLogs = await db.auditLog.findMany({
//     where: {
//       workspaceId: membership.workspaceId,
//       action: "pm.prd.sent_to_development",
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//     take: 50,
//   });

//   for (const log of sentTaskLogs) {
//     const metadata = parseMetadata<{
//       projectId?: string;
//       tasks?: unknown[];
//     }>(log.metadata);

//     if (metadata?.projectId && Array.isArray(metadata.tasks)) {
//       projectId = metadata.projectId;
//       break;
//     }
//   }
// }

//   if (isDeveloper && !projectId) {
//     const acceptedInvite = await db.invite.findFirst({
//       where: {
//         email: session.user.email,
//         role: "DEVELOPER",
//         status: "ACCEPTED",
//         projectId: {
//           not: null,
//         },
//       },
//       orderBy: {
//         acceptedAt: "desc",
//       },
//       select: {
//         projectId: true,
//       },
//     });

//     projectId = acceptedInvite?.projectId ?? "";
//   }

//   if (!projectId) {
//     return (
//       <main className="min-h-screen bg-[#111111] px-10 py-10 text-white">
//         <section className="rounded-3xl border border-white/10 bg-[#171717] p-8">
//           <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//             Developer Portal
//           </p>

//           <h1 className="mt-4 text-3xl font-semibold">No project assigned</h1>

//           <p className="mt-3 text-sm leading-7 text-white/45">
//             This developer account is active, but no project access was found.
//           </p>
//         </section>
//       </main>
//     );
//   }

//   if (isDeveloper) {
//     const projectMember = await db.clientProjectMember.findFirst({
//       where: {
//         userId: session.user.id,
//         projectId,
//         role: "DEVELOPER",
//       },
//       select: {
//         id: true,
//       },
//     });

//     const acceptedInvite = await db.invite.findFirst({
//       where: {
//         email: session.user.email,
//         role: "DEVELOPER",
//         status: "ACCEPTED",
//         projectId,
//       },
//       select: {
//         id: true,
//       },
//     });

//     if (!projectMember && !acceptedInvite) {
//       redirect("/auth/redirect");
//     }
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
//     redirect("/auth/redirect");
//   }

//   const logs = await db.auditLog.findMany({
//     where: {
//       workspaceId: project.workspaceId,
//       action: "pm.prd.sent_to_development",
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//     take: 200,
//   });

//   const reviewLogs = await db.auditLog.findMany({
//     where: {
//       workspaceId: project.workspaceId,
//       action: "developer.pr.ai_reviewed",
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//     take: 200,
//   });

//   const latestReviewByKey = new Map<string, LatestReview>();

//   for (const log of reviewLogs) {
//     const metadata = parseMetadata<LatestReview>(log.metadata);

//     if (!metadata) continue;

//     const key = reviewKey({
//       projectId: metadata.projectId,
//       requestId: metadata.requestId,
//       prdId: metadata.prdId,
//     });

//     if (!latestReviewByKey.has(key)) {
//       latestReviewByKey.set(key, metadata);
//     }
//   }

//   const batches = logs
//     .map((log) => {
//       const metadata = parseMetadata<Omit<DevelopmentBatch, "id">>(
//         log.metadata,
//       );

//       if (!metadata) return null;

//       if (
//         !metadata.prdId ||
//         !metadata.projectId ||
//         !metadata.requestId ||
//         !Array.isArray(metadata.tasks)
//       ) {
//         return null;
//       }

//       if (metadata.projectId !== projectId) {
//         return null;
//       }

//       const key = reviewKey({
//         projectId: metadata.projectId,
//         requestId: metadata.requestId,
//         prdId: metadata.prdId,
//       });

//       return {
//         id: log.id,
//         prdId: metadata.prdId,
//         requestId: metadata.requestId,
//         projectId: metadata.projectId,
//         projectName: metadata.projectName || project.name,
//         repository:
//           metadata.repository || project.gitHubRepo?.repoFullName || "",
//         title: metadata.title || "Development task",
//         finalContent: metadata.finalContent || "",
//         status: metadata.status || "SENT_TO_DEVELOPMENT",
//         tasks: metadata.tasks,
//         createdAt:
//           safeString(metadata.createdAt) || log.createdAt.toISOString(),
//         latestReview: latestReviewByKey.get(key) || null,
//       } satisfies DevelopmentBatch;
//     })
//     .filter((batch): batch is DevelopmentBatch => Boolean(batch));

//   return (
//     <DeveloperReviewClient
//       project={{
//         id: project.id,
//         name: project.name,
//         repository: project.gitHubRepo?.repoFullName ?? "",
//       }}
//       sessionUser={{
//         name: session.user.name ?? "",
//         email: session.user.email,
//       }}
//       initialBatches={batches}
//     />
//   );
// }
































import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DeveloperReviewClient from "./dev-review-client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    projectId?: string;
  }>;
};

type DevelopmentTask = {
  id: string;
  title: string;
  ownerRole: string;
  summary?: string;
  workItems?: string[];
  affectedFiles?: string[];
  area?: string;
  reason?: string;
  acceptanceCriteria?: string[];
  status: string;
};

type ReviewIssue = {
  severity: "BLOCKING" | "NON_BLOCKING";
  file?: string;
  issue: string;
  recommendation: string;
};

type LatestReview = {
  projectId?: string;
  requestId?: string;
  prdId?: string;
  repository?: string;
  pullNumber?: number;
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  pullRequestState?: string;
  changedFiles?: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }[];
  review?: {
    status: "FIX_REQUIRED" | "AI_APPROVED";
    summary: string;
    issues: ReviewIssue[];
  };
  status?: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
  createdAt?: string;
};

type DevelopmentBatch = {
  id: string;
  prdId: string;
  requestId: string;
  projectId: string;
  projectName: string;
  repository: string;
  title: string;
  finalContent: string;
  status: string;
  tasks: DevelopmentTask[];
  createdAt: string;
  latestReview: LatestReview | null;
};

type SentToDevelopmentMetadata = {
  prdId?: string;
  requestId?: string;
  projectId?: string;
  projectName?: string;
  repository?: string;
  title?: string;
  finalContent?: string;
  status?: string;
  tasks?: DevelopmentTask[];
  createdAt?: string;
};

function safeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parseMetadata<T>(metadata: unknown): T | null {
  try {
    if (!metadata) return null;

    const parsed =
      typeof metadata === "string"
        ? JSON.parse(metadata)
        : JSON.parse(JSON.stringify(metadata));

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

function reviewKey({
  projectId,
  requestId,
  prdId,
}: {
  projectId?: string;
  requestId?: string;
  prdId?: string;
}) {
  return `${projectId || ""}:${requestId || ""}:${prdId || ""}`;
}

export default async function DeveloperPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session.user.email) {
    redirect("/auth/sign-in");
  }

  const params = await searchParams;
  let projectId = String(params.projectId ?? "").trim();

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/auth/sign-in");
  }

  const isDeveloper = membership.role === "DEVELOPER";
  const isAdmin = membership.role === "ADMIN";

  if (!isDeveloper && !isAdmin) {
    redirect("/auth/redirect");
  }

  if (isDeveloper && !projectId) {
    const projectMember = await db.clientProjectMember.findFirst({
      where: {
        userId: session.user.id,
        role: "DEVELOPER",
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        projectId: true,
      },
    });

    if (projectMember?.projectId) {
      projectId = projectMember.projectId;
    }
  }

  if (isDeveloper && !projectId) {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email: session.user.email,
        role: "DEVELOPER",
        status: "ACCEPTED",
        projectId: {
          not: null,
        },
      },
      orderBy: {
        acceptedAt: "desc",
      },
      select: {
        projectId: true,
      },
    });

    if (acceptedInvite?.projectId) {
      projectId = acceptedInvite.projectId;
    }
  }

  if (!projectId) {
    const sentTaskLogs = await db.auditLog.findMany({
      where: {
        workspaceId: membership.workspaceId,
        action: "pm.prd.sent_to_development",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    for (const log of sentTaskLogs) {
      const metadata = parseMetadata<SentToDevelopmentMetadata>(log.metadata);

      if (metadata?.projectId && Array.isArray(metadata.tasks)) {
        projectId = metadata.projectId;
        break;
      }
    }
  }

  if (isAdmin && !projectId) {
    const firstProject = await db.project.findFirst({
      where: {
        workspaceId: membership.workspaceId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    if (firstProject?.id) {
      projectId = firstProject.id;
    }
  }

  if (!projectId) {
    return (
      <main className="min-h-screen bg-[#111111] px-10 py-10 text-white">
        <section className="rounded-3xl border border-white/10 bg-[#171717] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            Developer Portal
          </p>

          <h1 className="mt-4 text-3xl font-semibold">No project assigned</h1>

          <p className="mt-3 text-sm leading-7 text-white/45">
            This developer account is active, but no project access was found.
          </p>
        </section>
      </main>
    );
  }

  if (isDeveloper) {
    const projectMember = await db.clientProjectMember.findFirst({
      where: {
        userId: session.user.id,
        projectId,
        role: "DEVELOPER",
      },
      select: {
        id: true,
      },
    });

    const acceptedInvite = await db.invite.findFirst({
      where: {
        email: session.user.email,
        role: "DEVELOPER",
        status: "ACCEPTED",
        projectId,
      },
      select: {
        id: true,
      },
    });

    const sentTaskLogForProject = await db.auditLog.findFirst({
      where: {
        workspaceId: membership.workspaceId,
        action: "pm.prd.sent_to_development",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let hasTaskAccess = false;

    if (sentTaskLogForProject?.metadata) {
      const metadata = parseMetadata<SentToDevelopmentMetadata>(
        sentTaskLogForProject.metadata,
      );

      hasTaskAccess = metadata?.projectId === projectId;
    }

    if (!projectMember && !acceptedInvite && !hasTaskAccess) {
      redirect("/auth/redirect");
    }
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
    redirect("/auth/redirect");
  }

  const logs = await db.auditLog.findMany({
    where: {
      workspaceId: project.workspaceId,
      action: "pm.prd.sent_to_development",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });

  const reviewLogs = await db.auditLog.findMany({
    where: {
      workspaceId: project.workspaceId,
      action: "developer.pr.ai_reviewed",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });

  const latestReviewByKey = new Map<string, LatestReview>();

  for (const log of reviewLogs) {
    const metadata = parseMetadata<LatestReview>(log.metadata);

    if (!metadata) continue;

    const key = reviewKey({
      projectId: metadata.projectId,
      requestId: metadata.requestId,
      prdId: metadata.prdId,
    });

    if (!latestReviewByKey.has(key)) {
      latestReviewByKey.set(key, metadata);
    }
  }

  const batches: DevelopmentBatch[] = logs.reduce<DevelopmentBatch[]>(
    (acc, log) => {
      const metadata = parseMetadata<SentToDevelopmentMetadata>(log.metadata);

      if (!metadata) {
        return acc;
      }

      if (
        !metadata.prdId ||
        !metadata.projectId ||
        !metadata.requestId ||
        !Array.isArray(metadata.tasks)
      ) {
        return acc;
      }

      if (metadata.projectId !== projectId) {
        return acc;
      }

      const key = reviewKey({
        projectId: metadata.projectId,
        requestId: metadata.requestId,
        prdId: metadata.prdId,
      });

      const batch: DevelopmentBatch = {
        id: log.id,
        prdId: metadata.prdId,
        requestId: metadata.requestId,
        projectId: metadata.projectId,
        projectName: metadata.projectName || project.name,
        repository: metadata.repository || project.gitHubRepo?.repoFullName || "",
        title: metadata.title || "Development task",
        finalContent: metadata.finalContent || "",
        status: metadata.status || "SENT_TO_DEVELOPMENT",
        tasks: metadata.tasks,
        createdAt: safeString(metadata.createdAt) || log.createdAt.toISOString(),
        latestReview: latestReviewByKey.get(key) ?? null,
      };

      acc.push(batch);

      return acc;
    },
    [],
  );

  return (
    <DeveloperReviewClient
      project={{
        id: project.id,
        name: project.name,
        repository: project.gitHubRepo?.repoFullName ?? "",
      }}
      sessionUser={{
        name: session.user.name ?? "",
        email: session.user.email,
      }}
      initialBatches={batches}
    />
  );
}