// import { auth } from "@/lib/auth";
// import { db } from "@shipflow/db";
// import { headers } from "next/headers";
// import { redirect } from "next/navigation";
// import SeniorReviewClient from "./client";

// export const dynamic = "force-dynamic";

// type PageProps = {
//   searchParams: Promise<{
//     summaryId?: string;
//     projectId?: string;
//   }>;
// };

// type ReviewIssue = {
//   severity: "BLOCKING" | "NON_BLOCKING";
//   file?: string;
//   issue: string;
//   recommendation: string;
// };

// type SeniorSummary = {
//   title: string;
//   executiveSummary: string;
//   pullRequestSummary: {
//     pullRequestUrl: string;
//     pullRequestTitle: string;
//     pullNumber: number | null;
//     repository: string;
//   };
//   taskSummary: {
//     title: string;
//     ownerRole: string;
//     summary: string;
//   };
//   failedAttempts: {
//     pullRequestUrl: string;
//     summary: string;
//     issues: ReviewIssue[];
//     createdAt: string;
//   }[];
//   finalChanges: {
//     file: string;
//     status: string;
//     additions: number;
//     deletions: number;
//     changes: number;
//   }[];
//   implementedChanges?: {
//     title: string;
//     description: string;
//     files: string[];
//   }[];
//   pullRequests?: {
//     pullRequestUrl: string;
//     pullRequestTitle: string;
//     pullNumber: number | null;
//     repository: string;
//     status: string;
//     aiDecision: string;
//     changedFiles: {
//       file: string;
//       status: string;
//       additions: number;
//       deletions: number;
//       changes: number;
//     }[];
//     issues: ReviewIssue[];
//   }[];
//   aiDecision: string;
//   seniorChecklist: string[];
//   reviewerNotes: string;
// };

// type SeniorSummaryMetadata = {
//   projectId?: string;
//   requestId?: string;
//   prdId?: string;
//   taskId?: string;
//   taskTitle?: string;
//   ownerRole?: string;
//   repository?: string;
//   pullRequestUrl?: string;
//   pullRequestTitle?: string;
//   pullNumber?: number | null;
//   status?: string;
//   summary?: SeniorSummary;
//   reviewHistoryCount?: number;
//   createdAt?: string;
// };

// type SeniorSummaryItem = {
//   id: string;
//   projectId: string;
//   requestId: string;
//   prdId: string;
//   taskId: string;
//   taskTitle: string;
//   ownerRole: string;
//   repository: string;
//   pullRequestUrl: string;
//   pullRequestTitle: string;
//   pullNumber: number | null;
//   status: string;
//   createdAt: string;
//   summary: SeniorSummary;
// };

// const SENIOR_ROLES = [
//   "SENIOR_ENG",
//   "SENIOR_ENGINEER",
//   "SENIOR_DEVELOPER",
//   "REVIEWER",
//   "HUMAN_REVIEWER",
//   "ADMIN",
// ];

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

// function isSeniorRole(role: unknown) {
//   return SENIOR_ROLES.includes(String(role));
// }

// function fallbackSummary(metadata: SeniorSummaryMetadata): SeniorSummary {
//   const taskTitle = safeString(metadata.taskTitle) || "Developer task";
//   const ownerRole = safeString(metadata.ownerRole) || "Developer";
//   const repository = safeString(metadata.repository);
//   const pullRequestUrl = safeString(metadata.pullRequestUrl);
//   const pullRequestTitle = safeString(metadata.pullRequestTitle);

//   return {
//     title: `Senior review summary for ${taskTitle}`,
//     executiveSummary:
//       "This implementation was sent by the developer after AI review marked the pull request ready for senior technical review.",
//     pullRequestSummary: {
//       pullRequestUrl,
//       pullRequestTitle,
//       pullNumber: metadata.pullNumber ?? null,
//       repository,
//     },
//     taskSummary: {
//       title: taskTitle,
//       ownerRole,
//       summary: "No task summary was included.",
//     },
//     failedAttempts: [],
//     finalChanges: [],
//     implementedChanges: [],
//     pullRequests: [],
//     aiDecision: "READY_FOR_HUMAN_REVIEW",
//     seniorChecklist: [
//       "Review the final GitHub pull request.",
//       "Confirm the implementation matches the PM-approved task.",
//       "Verify changed files are expected.",
//       "Confirm no blocking AI issues remain.",
//       "Approve, reject, or request changes in the next phase.",
//     ],
//     reviewerNotes:
//       "This summary is ready for senior technical review. Final approval actions will be added in the next phase.",
//   };
// }

// export default async function SeniorReviewPage({ searchParams }: PageProps) {
//   const session = await auth.api.getSession({
//     headers: await headers(),
//   });

//   if (!session?.user?.id || !session.user.email) {
//     redirect("/auth/sign-in");
//   }

//   const params = await searchParams;
//   const summaryId = safeString(params.summaryId);
//   const projectId = safeString(params.projectId);

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

//   const membershipRole = String(membership.role);
//   const isAdminPreview = membershipRole === "ADMIN";

//   if (!isSeniorRole(membership.role)) {
//     const acceptedInvite = await db.invite.findFirst({
//       where: {
//         email: session.user.email,
//         status: "ACCEPTED" as any,
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//       select: {
//         id: true,
//         role: true,
//       },
//     });

//     if (!acceptedInvite || !isSeniorRole(acceptedInvite.role)) {
//       redirect("/auth/redirect");
//     }
//   }

//   const summaryLogs = await db.auditLog.findMany({
//     where: {
//       workspaceId: membership.workspaceId,
//       action: "developer.pr.sent_to_senior",
//       ...(summaryId
//         ? {
//             id: summaryId,
//           }
//         : {}),
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//     take: summaryId ? 1 : 100,
//   });

//   const summaries: SeniorSummaryItem[] = summaryLogs
//     .map((log) => {
//       const metadata = parseMetadata<SeniorSummaryMetadata>(log.metadata);

//       if (!metadata) return null;

//       if (projectId && metadata.projectId !== projectId) {
//         return null;
//       }

//       const summary = metadata.summary || fallbackSummary(metadata);

//       return {
//         id: log.id,
//         projectId: safeString(metadata.projectId),
//         requestId: safeString(metadata.requestId),
//         prdId: safeString(metadata.prdId),
//         taskId: safeString(metadata.taskId),
//         taskTitle:
//           safeString(metadata.taskTitle) ||
//           summary.taskSummary.title ||
//           "Developer task",
//         ownerRole:
//           safeString(metadata.ownerRole) ||
//           summary.taskSummary.ownerRole ||
//           "Developer",
//         repository:
//           safeString(metadata.repository) ||
//           summary.pullRequestSummary.repository ||
//           "",
//         pullRequestUrl:
//           safeString(metadata.pullRequestUrl) ||
//           summary.pullRequestSummary.pullRequestUrl ||
//           "",
//         pullRequestTitle:
//           safeString(metadata.pullRequestTitle) ||
//           summary.pullRequestSummary.pullRequestTitle ||
//           "",
//         pullNumber:
//           typeof metadata.pullNumber === "number"
//             ? metadata.pullNumber
//             : summary.pullRequestSummary.pullNumber,
//         status: safeString(metadata.status) || "SENT_TO_SENIOR_REVIEW",
//         createdAt: metadata.createdAt || log.createdAt.toISOString(),
//         summary,
//       };
//     })
//     .filter((item): item is SeniorSummaryItem => Boolean(item));

//   const selectedSummary = summaryId
//     ? summaries.find((summary) => summary.id === summaryId) || summaries[0]
//     : summaries[0];

//   if (selectedSummary) {
//     await db.auditLog.create({
//       data: {
//         workspaceId: membership.workspaceId,
//         actorId: session.user.id,
//         action: "senior.summary.viewed",
//         entityType: "SeniorReviewSummary",
//         entityId: selectedSummary.id,
//         metadata: JSON.stringify({
//           seniorEngineerId: session.user.id,
//           seniorEngineerName: session.user.name || "",
//           seniorEngineerEmail: session.user.email,
//           seniorEngineerRole: membershipRole,
//           summaryId: selectedSummary.id,
//           projectId: selectedSummary.projectId,
//           taskId: selectedSummary.taskId,
//           taskTitle: selectedSummary.taskTitle,
//           repository: selectedSummary.repository,
//           pullRequestUrl: selectedSummary.pullRequestUrl,
//           mode: isAdminPreview ? "ADMIN_READ_ONLY_PREVIEW" : "SENIOR_ENGINEER",
//           message:
//             "Senior engineer opened a developer handoff summary. Page is read-only.",
//           createdAt: new Date().toISOString(),
//         }),
//       },
//     });
//   }

//   return (
//     <SeniorReviewClient
//       mode={isAdminPreview ? "ADMIN_READ_ONLY_PREVIEW" : "SENIOR_ENGINEER"}
//       senior={{
//         name: session.user.name || "Senior Engineer",
//         email: session.user.email,
//         role: membershipRole,
//       }}
//       summaries={summaries}
//       selectedSummaryId={selectedSummary?.id || ""}
//     />
//   );
// }











// import { auth } from "@/lib/auth";
// import { db } from "@shipflow/db";
// import { headers } from "next/headers";
// import { redirect } from "next/navigation";
// import SeniorReviewClient from "./client";

// export const dynamic = "force-dynamic";

// type PageProps = {
//   searchParams: Promise<{
//     summaryId?: string;
//     projectId?: string;
//   }>;
// };

// type SeniorDecision = {
//   summaryId: string;
//   auditLogId: string;
//   action: string;
//   status:
//     | "MERGED_TO_MAIN"
//     | "ALREADY_MERGED_TO_MAIN"
//     | "FEATURE_SHIPPED"
//     | "CHANGES_REQUESTED"
//     | "REJECTED";
//   reason?: string;
//   message?: string;
//   createdAt: string;
//   pullRequestUrl?: string;
//   pullRequestTitle?: string;
//   pullNumber?: number | null;
//   repository?: string;
//   mergeSha?: string;
//   mergedByName?: string;
//   mergedByEmail?: string;
// };

// type ReviewIssue = {
//   severity: "BLOCKING" | "NON_BLOCKING";
//   file?: string;
//   issue: string;
//   recommendation: string;
// };

// type SeniorSummary = {
//   title: string;
//   executiveSummary: string;
//   pullRequestSummary: {
//     pullRequestUrl: string;
//     pullRequestTitle: string;
//     pullNumber: number | null;
//     repository: string;
//   };
//   taskSummary: {
//     title: string;
//     ownerRole: string;
//     summary: string;
//   };
//   failedAttempts: {
//     pullRequestUrl: string;
//     summary: string;
//     issues: ReviewIssue[];
//     createdAt: string;
//   }[];
//   finalChanges: {
//     file: string;
//     status: string;
//     additions: number;
//     deletions: number;
//     changes: number;
//   }[];
//   implementedChanges?: {
//     title: string;
//     description: string;
//     files: string[];
//   }[];
//   pullRequests?: {
//     pullRequestUrl: string;
//     pullRequestTitle: string;
//     pullNumber: number | null;
//     repository: string;
//     status: string;
//     aiDecision: string;
//     changedFiles: {
//       file: string;
//       status: string;
//       additions: number;
//       deletions: number;
//       changes: number;
//     }[];
//     issues: ReviewIssue[];
//   }[];
//   aiDecision: string;
//   seniorChecklist: string[];
//   reviewerNotes: string;
// };

// type SeniorSummaryMetadata = {
//   projectId?: string;
//   requestId?: string;
//   prdId?: string;
//   taskId?: string;
//   taskTitle?: string;
//   ownerRole?: string;
//   repository?: string;
//   pullRequestUrl?: string;
//   pullRequestTitle?: string;
//   pullNumber?: number | null;
//   status?: string;
//   summary?: SeniorSummary;
//   reviewHistoryCount?: number;
//   createdAt?: string;
// };

// type SeniorSummaryItem = {
//   id: string;
//   projectId: string;
//   requestId: string;
//   prdId: string;
//   taskId: string;
//   taskTitle: string;
//   ownerRole: string;
//   repository: string;
//   pullRequestUrl: string;
//   pullRequestTitle: string;
//   pullNumber: number | null;
//   status: string;
//   createdAt: string;
//   summary: SeniorSummary;
// };



// const SENIOR_ROLES = [
//   "SENIOR_ENG",
//   "SENIOR_ENGINEER",
//   "SENIOR_DEVELOPER",
//   "REVIEWER",
//   "HUMAN_REVIEWER",
//   "ADMIN",
// ];

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

// function isSeniorRole(role: unknown) {
//   return SENIOR_ROLES.includes(String(role));
// }

// function fallbackSummary(metadata: SeniorSummaryMetadata): SeniorSummary {
//   const taskTitle = safeString(metadata.taskTitle) || "Developer task";
//   const ownerRole = safeString(metadata.ownerRole) || "Developer";
//   const repository = safeString(metadata.repository);
//   const pullRequestUrl = safeString(metadata.pullRequestUrl);
//   const pullRequestTitle = safeString(metadata.pullRequestTitle);

//   return {
//     title: `Senior review summary for ${taskTitle}`,
//     executiveSummary:
//       "This implementation was sent by the developer after AI review marked the pull request ready for senior technical review.",
//     pullRequestSummary: {
//       pullRequestUrl,
//       pullRequestTitle,
//       pullNumber: metadata.pullNumber ?? null,
//       repository,
//     },
//     taskSummary: {
//       title: taskTitle,
//       ownerRole,
//       summary: "No task summary was included.",
//     },
//     failedAttempts: [],
//     finalChanges: [],
//     implementedChanges: [],
//     pullRequests: [],
//     aiDecision: "READY_FOR_HUMAN_REVIEW",
//     seniorChecklist: [
//       "Review the final GitHub pull request.",
//       "Confirm the implementation matches the PM-approved task.",
//       "Verify changed files are expected.",
//       "Confirm no blocking AI issues remain.",
//       "Approve, reject, or request changes in the next phase.",
//     ],
//     reviewerNotes:
//       "This summary is ready for senior technical review. Final approval actions will be added in the next phase.",
//   };
// }

// function mapSummaryLogToItem(log: {
//   id: string;
//   createdAt: Date;
//   metadata: unknown;
// }) {
//   const metadata = parseMetadata<SeniorSummaryMetadata>(log.metadata);

//   if (!metadata) return null;

//   const summary = metadata.summary || fallbackSummary(metadata);

//   const item: SeniorSummaryItem = {
//     id: log.id,
//     projectId: safeString(metadata.projectId),
//     requestId: safeString(metadata.requestId),
//     prdId: safeString(metadata.prdId),
//     taskId: safeString(metadata.taskId),
//     taskTitle:
//       safeString(metadata.taskTitle) ||
//       summary.taskSummary.title ||
//       "Developer task",
//     ownerRole:
//       safeString(metadata.ownerRole) ||
//       summary.taskSummary.ownerRole ||
//       "Developer",
//     repository:
//       safeString(metadata.repository) ||
//       summary.pullRequestSummary.repository ||
//       "",
//     pullRequestUrl:
//       safeString(metadata.pullRequestUrl) ||
//       summary.pullRequestSummary.pullRequestUrl ||
//       "",
//     pullRequestTitle:
//       safeString(metadata.pullRequestTitle) ||
//       summary.pullRequestSummary.pullRequestTitle ||
//       "",
//     pullNumber:
//       typeof metadata.pullNumber === "number"
//         ? metadata.pullNumber
//         : summary.pullRequestSummary.pullNumber,
//     status: safeString(metadata.status) || "SENT_TO_SENIOR_REVIEW",
//     createdAt: metadata.createdAt || log.createdAt.toISOString(),
//     summary,
//   };

//   return item;
// }

// export default async function SeniorReviewPage({ searchParams }: PageProps) {
//   const session = await auth.api.getSession({
//     headers: await headers(),
//   });

//   if (!session?.user?.id || !session.user.email) {
//     redirect("/auth/sign-in");
//   }

//   const params = await searchParams;
//   const summaryId = safeString(params.summaryId);
//   const projectId = safeString(params.projectId);

//   const membership = await db.membership.findFirst({
//     where: {
//       userId: session.user.id,
//     },
//     orderBy: {
//       createdAt: "asc",
//     },
//   });

//   const acceptedInvites = await db.invite.findMany({
//     where: {
//       email: session.user.email,
//       status: "ACCEPTED" as any,
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//     select: {
//       id: true,
//       role: true,
//       projectId: true,
//     },
//   });

//   const seniorProjectIds = acceptedInvites
//     .filter((invite) => isSeniorRole(invite.role) && invite.projectId)
//     .map((invite) => String(invite.projectId));

//   const seniorProjects =
//     seniorProjectIds.length > 0
//       ? await db.project.findMany({
//           where: {
//             id: {
//               in: seniorProjectIds,
//             },
//           },
//           select: {
//             id: true,
//             workspaceId: true,
//           },
//         })
//       : [];

//   const allowedWorkspaceIds = new Set<string>();

//   if (membership && isSeniorRole(membership.role)) {
//     allowedWorkspaceIds.add(membership.workspaceId);
//   }

//   for (const project of seniorProjects) {
//     allowedWorkspaceIds.add(project.workspaceId);
//   }

//   const membershipRole = membership ? String(membership.role) : "SENIOR_ENG";
//   const isAdminPreview = membershipRole === "ADMIN";

//   const hasSeniorAccess =
//     (membership && isSeniorRole(membership.role)) ||
//     acceptedInvites.some((invite) => isSeniorRole(invite.role));

//   if (!hasSeniorAccess) {
//     redirect("/auth/redirect");
//   }

//   let summaryLogs: {
//     id: string;
//     workspaceId: string;
//     createdAt: Date;
//     metadata: unknown;
//     action: string;
//   }[] = [];

//   if (summaryId) {
//     const log = await db.auditLog.findUnique({
//       where: {
//         id: summaryId,
//       },
//       select: {
//         id: true,
//         workspaceId: true,
//         createdAt: true,
//         metadata: true,
//         action: true,
//       },
//     });

//     if (log && log.action === "developer.pr.sent_to_senior") {
//       const metadata = parseMetadata<SeniorSummaryMetadata>(log.metadata);
//       const logProjectId = safeString(metadata?.projectId);

//       const hasProjectInviteAccess =
//         !logProjectId || seniorProjectIds.includes(logProjectId);

//       const hasWorkspaceAccess =
//         allowedWorkspaceIds.has(log.workspaceId) || hasProjectInviteAccess;

//       if (hasWorkspaceAccess) {
//         summaryLogs = [log];
//         allowedWorkspaceIds.add(log.workspaceId);
//       }
//     }
//   } else {
//     const workspaceIds = Array.from(allowedWorkspaceIds);

//     if (workspaceIds.length > 0) {
//       summaryLogs = await db.auditLog.findMany({
//         where: {
//           workspaceId: {
//             in: workspaceIds,
//           },
//           action: "developer.pr.sent_to_senior",
//         },
//         orderBy: {
//           createdAt: "desc",
//         },
//         take: 100,
//         select: {
//           id: true,
//           workspaceId: true,
//           createdAt: true,
//           metadata: true,
//           action: true,
//         },
//       });
//     }
//   }

//   const summaries: SeniorSummaryItem[] = summaryLogs
//   .map((log) => mapSummaryLogToItem(log))
//   .filter((item): item is SeniorSummaryItem => {
//     if (!item) return false;

//     if (projectId && item.projectId !== projectId) {
//       return false;
//     }

//     if (seniorProjectIds.length > 0 && item.projectId) {
//       return seniorProjectIds.includes(item.projectId);
//     }

//     return true;
//   });

// const decisionWorkspaceIds = Array.from(allowedWorkspaceIds);

// const decisionLogs =
//   decisionWorkspaceIds.length > 0
//     ? await db.auditLog.findMany({
//         where: {
//           workspaceId: {
//             in: decisionWorkspaceIds,
//           },
//           action: {
//             in: [
//               "senior.pr.approved_and_merged",
//               "senior.pr.changes_requested",
//               "senior.pr.rejected",
//             ],
//           },
//         },
//         orderBy: {
//           createdAt: "desc",
//         },
//         take: 300,
//         select: {
//           id: true,
//           action: true,
//           metadata: true,
//           createdAt: true,
//         },
//       })
//     : [];

// const initialDecisionBySummaryId: Record<string, SeniorDecision> = {};

// for (const log of decisionLogs) {
//   const metadata = parseMetadata<Record<string, unknown>>(log.metadata);
//   const logSummaryId = safeString(metadata?.summaryId);

//   if (!logSummaryId) continue;
//   if (initialDecisionBySummaryId[logSummaryId]) continue;

//   const status = safeString(metadata?.status);

//   initialDecisionBySummaryId[logSummaryId] = {
//     summaryId: logSummaryId,
//     auditLogId: log.id,
//     action: log.action,
//     status:
//       status === "ALREADY_MERGED_TO_MAIN"
//         ? "ALREADY_MERGED_TO_MAIN"
//         : status === "CHANGES_REQUESTED"
//           ? "CHANGES_REQUESTED"
//           : status === "REJECTED"
//             ? "REJECTED"
//             : "MERGED_TO_MAIN",
//     reason: safeString(metadata?.reason),
//     message: safeString(metadata?.message),
//     createdAt: safeString(metadata?.mergedAt) || log.createdAt.toISOString(),
//     pullRequestUrl: safeString(metadata?.pullRequestUrl),
//     pullRequestTitle: safeString(metadata?.pullRequestTitle),
//     pullNumber:
//       typeof metadata?.pullNumber === "number" ? metadata.pullNumber : null,
//     repository: safeString(metadata?.repository),
//     mergeSha: safeString(metadata?.mergeSha),
//     mergedByName: safeString(metadata?.mergedByName),
//     mergedByEmail: safeString(metadata?.mergedByEmail),
//   };
// }

// const selectedSummary = summaryId
//   ? summaries.find((summary) => summary.id === summaryId) || summaries[0]
//   : summaries[0];

//   if (selectedSummary && Array.from(allowedWorkspaceIds).length > 0) {
//     const workspaceId =
//       summaryLogs.find((log) => log.id === selectedSummary.id)?.workspaceId ||
//       Array.from(allowedWorkspaceIds)[0];

//     await db.auditLog.create({
//       data: {
//         workspaceId,
//         actorId: session.user.id,
//         action: "senior.summary.viewed",
//         entityType: "SeniorReviewSummary",
//         entityId: selectedSummary.id,
//         metadata: JSON.stringify({
//           seniorEngineerId: session.user.id,
//           seniorEngineerName: session.user.name || "",
//           seniorEngineerEmail: session.user.email,
//           seniorEngineerRole: membershipRole,
//           summaryId: selectedSummary.id,
//           projectId: selectedSummary.projectId,
//           taskId: selectedSummary.taskId,
//           taskTitle: selectedSummary.taskTitle,
//           repository: selectedSummary.repository,
//           pullRequestUrl: selectedSummary.pullRequestUrl,
//           mode: isAdminPreview ? "ADMIN_READ_ONLY_PREVIEW" : "SENIOR_ENGINEER",
//           message:
//             "Senior engineer opened a developer handoff summary. Page is read-only.",
//           createdAt: new Date().toISOString(),
//         }),
//       },
//     });
//   }

//   return (
//     <SeniorReviewClient
//   mode={isAdminPreview ? "ADMIN_READ_ONLY_PREVIEW" : "SENIOR_ENGINEER"}
//   senior={{
//     name: session.user.name || "Senior Engineer",
//     email: session.user.email,
//     role: membershipRole,
//   }}
//   summaries={summaries}
//   selectedSummaryId={selectedSummary?.id || ""}
//   initialDecisionBySummaryId={initialDecisionBySummaryId}
// />
//   );
// }
















import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SeniorReviewClient from "./client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    summaryId?: string;
    projectId?: string;
  }>;
};

type ReviewIssue = {
  severity: "BLOCKING" | "NON_BLOCKING";
  file?: string;
  issue: string;
  recommendation: string;
};

type SeniorSummary = {
  title: string;
  executiveSummary: string;
  pullRequestSummary: {
    pullRequestUrl: string;
    pullRequestTitle: string;
    pullNumber: number | null;
    repository: string;
  };
  taskSummary: {
    title: string;
    ownerRole: string;
    summary: string;
  };
  failedAttempts: {
    pullRequestUrl: string;
    summary: string;
    issues: ReviewIssue[];
    createdAt: string;
  }[];
  finalChanges: {
    file: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }[];
  implementedChanges?: {
    title: string;
    description: string;
    files: string[];
  }[];
  pullRequests?: {
    pullRequestUrl: string;
    pullRequestTitle: string;
    pullNumber: number | null;
    repository: string;
    status: string;
    aiDecision: string;
    changedFiles: {
      file: string;
      status: string;
      additions: number;
      deletions: number;
      changes: number;
    }[];
    issues: ReviewIssue[];
  }[];
  aiDecision: string;
  seniorChecklist: string[];
  reviewerNotes: string;
};

type SeniorSummaryMetadata = {
  projectId?: string;
  requestId?: string;
  prdId?: string;
  taskId?: string;
  taskTitle?: string;
  ownerRole?: string;
  repository?: string;
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  pullNumber?: number | null;
  status?: string;
  summary?: SeniorSummary;
  reviewHistoryCount?: number;
  createdAt?: string;
};

type SeniorSummaryItem = {
  id: string;
  projectId: string;
  requestId: string;
  prdId: string;
  taskId: string;
  taskTitle: string;
  ownerRole: string;
  repository: string;
  pullRequestUrl: string;
  pullRequestTitle: string;
  pullNumber: number | null;
  status: string;
  createdAt: string;
  summary: SeniorSummary;
};

type SeniorDecision = {
  summaryId: string;
  auditLogId: string;
  action: string;
  status:
    | "MERGED_TO_MAIN"
    | "ALREADY_MERGED_TO_MAIN"
    | "FEATURE_SHIPPED"
    | "CHANGES_REQUESTED"
    | "REJECTED";
  reason?: string;
  message?: string;
  createdAt: string;
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  pullNumber?: number | null;
  repository?: string;
  mergeSha?: string;
  mergedByName?: string;
  mergedByEmail?: string;
};

const SENIOR_ROLES = [
  "SENIOR_ENG",
  "SENIOR_ENGINEER",
  "SENIOR_DEVELOPER",
  "REVIEWER",
  "HUMAN_REVIEWER",
  "ADMIN",
];

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

function isSeniorRole(role: unknown) {
  return SENIOR_ROLES.includes(String(role));
}

function fallbackSummary(metadata: SeniorSummaryMetadata): SeniorSummary {
  const taskTitle = safeString(metadata.taskTitle) || "Developer task";
  const ownerRole = safeString(metadata.ownerRole) || "Developer";
  const repository = safeString(metadata.repository);
  const pullRequestUrl = safeString(metadata.pullRequestUrl);
  const pullRequestTitle = safeString(metadata.pullRequestTitle);

  return {
    title: `Senior review summary for ${taskTitle}`,
    executiveSummary:
      "This implementation was sent by the developer after AI review marked the pull request ready for senior technical review.",
    pullRequestSummary: {
      pullRequestUrl,
      pullRequestTitle,
      pullNumber: metadata.pullNumber ?? null,
      repository,
    },
    taskSummary: {
      title: taskTitle,
      ownerRole,
      summary: "No task summary was included.",
    },
    failedAttempts: [],
    finalChanges: [],
    implementedChanges: [],
    pullRequests: [],
    aiDecision: "READY_FOR_HUMAN_REVIEW",
    seniorChecklist: [
      "Review the final GitHub pull request.",
      "Confirm the implementation matches the PM-approved task.",
      "Verify changed files are expected.",
      "Confirm no blocking AI issues remain.",
      "Approve, reject, or request changes in the next phase.",
    ],
    reviewerNotes:
      "This summary is ready for senior technical review. Final approval actions will be added in the next phase.",
  };
}

function mapSummaryLogToItem(log: {
  id: string;
  createdAt: Date;
  metadata: unknown;
}) {
  const metadata = parseMetadata<SeniorSummaryMetadata>(log.metadata);

  if (!metadata) return null;

  const summary = metadata.summary || fallbackSummary(metadata);

  const item: SeniorSummaryItem = {
    id: log.id,
    projectId: safeString(metadata.projectId),
    requestId: safeString(metadata.requestId),
    prdId: safeString(metadata.prdId),
    taskId: safeString(metadata.taskId),
    taskTitle:
      safeString(metadata.taskTitle) ||
      summary.taskSummary.title ||
      "Developer task",
    ownerRole:
      safeString(metadata.ownerRole) ||
      summary.taskSummary.ownerRole ||
      "Developer",
    repository:
      safeString(metadata.repository) ||
      summary.pullRequestSummary.repository ||
      "",
    pullRequestUrl:
      safeString(metadata.pullRequestUrl) ||
      summary.pullRequestSummary.pullRequestUrl ||
      "",
    pullRequestTitle:
      safeString(metadata.pullRequestTitle) ||
      summary.pullRequestSummary.pullRequestTitle ||
      "",
    pullNumber:
      typeof metadata.pullNumber === "number"
        ? metadata.pullNumber
        : summary.pullRequestSummary.pullNumber,
    status: safeString(metadata.status) || "SENT_TO_SENIOR_REVIEW",
    createdAt: metadata.createdAt || log.createdAt.toISOString(),
    summary,
  };

  return item;
}

export default async function SeniorReviewPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session.user.email) {
    redirect("/auth/sign-in");
  }

  const params = await searchParams;
  const summaryId = safeString(params.summaryId);
  const projectId = safeString(params.projectId);

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const acceptedInvites = await db.invite.findMany({
    where: {
      email: session.user.email,
      status: "ACCEPTED" as any,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      role: true,
      projectId: true,
    },
  });

  const seniorProjectIds = acceptedInvites
    .filter((invite) => isSeniorRole(invite.role) && invite.projectId)
    .map((invite) => String(invite.projectId));

  const seniorProjects =
    seniorProjectIds.length > 0
      ? await db.project.findMany({
          where: {
            id: {
              in: seniorProjectIds,
            },
          },
          select: {
            id: true,
            workspaceId: true,
          },
        })
      : [];

  const allowedWorkspaceIds = new Set<string>();

  if (membership && isSeniorRole(membership.role)) {
    allowedWorkspaceIds.add(membership.workspaceId);
  }

  for (const project of seniorProjects) {
    allowedWorkspaceIds.add(project.workspaceId);
  }

  const membershipRole = membership ? String(membership.role) : "SENIOR_ENG";
  const isAdminPreview = membershipRole === "ADMIN";

  const hasSeniorAccess =
    (membership && isSeniorRole(membership.role)) ||
    acceptedInvites.some((invite) => isSeniorRole(invite.role));

  if (!hasSeniorAccess) {
    redirect("/auth/redirect");
  }

  let summaryLogs: {
    id: string;
    workspaceId: string;
    createdAt: Date;
    metadata: unknown;
    action: string;
  }[] = [];

  if (summaryId) {
    const log = await db.auditLog.findUnique({
      where: {
        id: summaryId,
      },
      select: {
        id: true,
        workspaceId: true,
        createdAt: true,
        metadata: true,
        action: true,
      },
    });

    if (log && log.action === "developer.pr.sent_to_senior") {
      const metadata = parseMetadata<SeniorSummaryMetadata>(log.metadata);
      const logProjectId = safeString(metadata?.projectId);

      const hasProjectInviteAccess =
        !logProjectId || seniorProjectIds.includes(logProjectId);

      const hasWorkspaceAccess =
        allowedWorkspaceIds.has(log.workspaceId) || hasProjectInviteAccess;

      if (hasWorkspaceAccess) {
        summaryLogs = [log];
        allowedWorkspaceIds.add(log.workspaceId);
      }
    }
  } else {
    const workspaceIds = Array.from(allowedWorkspaceIds);

    if (workspaceIds.length > 0) {
      summaryLogs = await db.auditLog.findMany({
        where: {
          workspaceId: {
            in: workspaceIds,
          },
          action: "developer.pr.sent_to_senior",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
        select: {
          id: true,
          workspaceId: true,
          createdAt: true,
          metadata: true,
          action: true,
        },
      });
    }
  }

  const summaries: SeniorSummaryItem[] = summaryLogs
    .map((log) => mapSummaryLogToItem(log))
    .filter((item): item is SeniorSummaryItem => {
      if (!item) return false;

      if (projectId && item.projectId !== projectId) {
        return false;
      }

      if (seniorProjectIds.length > 0 && item.projectId) {
        return seniorProjectIds.includes(item.projectId);
      }

      return true;
    });

  const decisionWorkspaceIds = Array.from(allowedWorkspaceIds);

  const decisionLogs =
    decisionWorkspaceIds.length > 0
      ? await db.auditLog.findMany({
          where: {
            workspaceId: {
              in: decisionWorkspaceIds,
            },
            action: {
              in: [
                "senior.pr.approved_and_merged",
                "senior.pr.changes_requested",
                "senior.pr.rejected",
              ],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 300,
          select: {
            id: true,
            action: true,
            metadata: true,
            createdAt: true,
          },
        })
      : [];

  const initialDecisionBySummaryId: Record<string, SeniorDecision> = {};

  for (const log of decisionLogs) {
    const metadata = parseMetadata<Record<string, unknown>>(log.metadata);
    const logSummaryId = safeString(metadata?.summaryId);

    if (!logSummaryId) continue;
    if (initialDecisionBySummaryId[logSummaryId]) continue;

    const status = safeString(metadata?.status);

    initialDecisionBySummaryId[logSummaryId] = {
      summaryId: logSummaryId,
      auditLogId: log.id,
      action: log.action,
      status:
        status === "ALREADY_MERGED_TO_MAIN"
          ? "ALREADY_MERGED_TO_MAIN"
          : status === "FEATURE_SHIPPED"
            ? "FEATURE_SHIPPED"
            : status === "CHANGES_REQUESTED"
              ? "CHANGES_REQUESTED"
              : status === "REJECTED"
                ? "REJECTED"
                : "MERGED_TO_MAIN",
      reason: safeString(metadata?.reason),
      message: safeString(metadata?.message),
      createdAt: safeString(metadata?.mergedAt) || log.createdAt.toISOString(),
      pullRequestUrl: safeString(metadata?.pullRequestUrl),
      pullRequestTitle: safeString(metadata?.pullRequestTitle),
      pullNumber:
        typeof metadata?.pullNumber === "number" ? metadata.pullNumber : null,
      repository: safeString(metadata?.repository),
      mergeSha: safeString(metadata?.mergeSha),
      mergedByName: safeString(metadata?.mergedByName),
      mergedByEmail: safeString(metadata?.mergedByEmail),
    };
  }

  const selectedSummary = summaryId
    ? summaries.find((summary) => summary.id === summaryId) || summaries[0]
    : summaries[0];

  if (selectedSummary && Array.from(allowedWorkspaceIds).length > 0) {
    const workspaceId =
      summaryLogs.find((log) => log.id === selectedSummary.id)?.workspaceId ||
      Array.from(allowedWorkspaceIds)[0];

    await db.auditLog.create({
      data: {
        workspaceId,
        actorId: session.user.id,
        action: "senior.summary.viewed",
        entityType: "SeniorReviewSummary",
        entityId: selectedSummary.id,
        metadata: JSON.stringify({
          seniorEngineerId: session.user.id,
          seniorEngineerName: session.user.name || "",
          seniorEngineerEmail: session.user.email,
          seniorEngineerRole: membershipRole,
          summaryId: selectedSummary.id,
          projectId: selectedSummary.projectId,
          taskId: selectedSummary.taskId,
          taskTitle: selectedSummary.taskTitle,
          repository: selectedSummary.repository,
          pullRequestUrl: selectedSummary.pullRequestUrl,
          mode: isAdminPreview ? "ADMIN_READ_ONLY_PREVIEW" : "SENIOR_ENGINEER",
          message:
            "Senior engineer opened a developer handoff summary. Page is read-only.",
          createdAt: new Date().toISOString(),
        }),
      },
    });
  }

  return (
    <SeniorReviewClient
      mode={isAdminPreview ? "ADMIN_READ_ONLY_PREVIEW" : "SENIOR_ENGINEER"}
      senior={{
        name: session.user.name || "Senior Engineer",
        email: session.user.email,
        role: membershipRole,
      }}
      summaries={summaries}
      selectedSummaryId={selectedSummary?.id || ""}
      initialDecisionBySummaryId={initialDecisionBySummaryId}
    />
  );
}