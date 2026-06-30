// "use client";

// import { useMemo, useState } from "react";
// import { LoomLogo } from "@/components/brand/loom-logo";

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

// type ReviewIssue = {
//   severity: "BLOCKING" | "NON_BLOCKING";
//   file?: string;
//   issue: string;
//   recommendation: string;
// };

// type AiReviewResult = {
//   status: "FIX_REQUIRED" | "AI_APPROVED";
//   summary: string;
//   issues: ReviewIssue[];
// };

// type ChangedFile = {
//   filename: string;
//   status: string;
//   additions: number;
//   deletions: number;
//   changes: number;
// };

// type ReviewResponse = {
//   ok: boolean;
//   status: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
//   review: AiReviewResult;
//   pullRequest: {
//     id?: string;
//     number: number;
//     title: string;
//     state: string;
//     url: string;
//   };
//   changedFiles: ChangedFile[];
//   githubComment?: {
//     status: string;
//     error?: string;
//   };
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
//   changedFiles?: ChangedFile[];
//   review?: AiReviewResult;
//   status?: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
//   createdAt?: string;
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

// type DeveloperReviewClientProps = {
//   project: {
//     id: string;
//     name: string;
//     repository: string;
//   };
//   sessionUser: {
//     name: string;
//     email: string;
//   };
//   initialBatches: DevelopmentBatch[];
// };

// function getTaskPoints(task: DevelopmentTask) {
//   if (Array.isArray(task.workItems) && task.workItems.length > 0) {
//     return task.workItems;
//   }

//   if (
//     Array.isArray(task.acceptanceCriteria) &&
//     task.acceptanceCriteria.length > 0
//   ) {
//     return task.acceptanceCriteria;
//   }

//   return ["Complete the task according to the PM-approved requirement."];
// }

// function getTaskSummary(task: DevelopmentTask) {
//   return task.summary || task.reason || "No task summary provided.";
// }

// function getTaskArea(task: DevelopmentTask) {
//   return task.area || "Development task";
// }

// function formatOwnerRole(role: string) {
//   return role
//     .replace(/_/g, " ")
//     .toLowerCase()
//     .replace(/\b\w/g, (char) => char.toUpperCase());
// }

// function getStatusLabel(status?: string) {
//   if (status === "READY_FOR_HUMAN_REVIEW") {
//     return "Ready for senior technical review";
//   }

//   if (status === "FIX_REQUIRED") {
//     return "Fix required";
//   }

//   return "Awaiting AI review";
// }

// function getStatusClass(status?: string) {
//   if (status === "READY_FOR_HUMAN_REVIEW") {
//     return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
//   }

//   if (status === "FIX_REQUIRED") {
//     return "border-red-500/30 bg-red-500/10 text-red-200";
//   }

//   return "border-[#aa4825]/40 bg-[#aa4825]/10 text-[#ff8a50]";
// }

// export default function DeveloperReviewClient({
//   project,
//   sessionUser,
//   initialBatches,
// }: DeveloperReviewClientProps) {
//   const [prInputs, setPrInputs] = useState<Record<string, string>>({});
//   const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
//   const [reviewResults, setReviewResults] = useState<
//     Record<string, ReviewResponse>
//   >({});

//   const [expandedTaskByBatch, setExpandedTaskByBatch] = useState<
//   Record<string, string | null>
// >({});

//   const [activeView, setActiveView] = useState<
//     "assigned-tasks" | "ai-reviews" | "fix-required"
//   >("assigned-tasks");

//   const batches = initialBatches;

//   const fixRequiredCount = useMemo(() => {
//     return batches.filter((batch) => {
//       const liveResult = reviewResults[batch.id];

//       if (liveResult) {
//         return liveResult.status === "FIX_REQUIRED";
//       }

//       return batch.latestReview?.status === "FIX_REQUIRED";
//     }).length;
//   }, [batches, reviewResults]);

//   const readyForHumanReviewCount = useMemo(() => {
//     return batches.filter((batch) => {
//       const liveResult = reviewResults[batch.id];

//       if (liveResult) {
//         return liveResult.status === "READY_FOR_HUMAN_REVIEW";
//       }

//       return batch.latestReview?.status === "READY_FOR_HUMAN_REVIEW";
//     }).length;
//   }, [batches, reviewResults]);

//   async function runAiReview(batch: DevelopmentBatch) {
//     const prInput = prInputs[batch.id]?.trim();

//     if (!prInput) {
//       setReviewErrors((prev) => ({
//         ...prev,
//         [batch.id]: "Paste a real GitHub pull request URL first.",
//       }));
//       return;
//     }

//     setReviewErrors((prev) => ({
//       ...prev,
//       [batch.id]: "",
//     }));

//     setReviewLoading((prev) => ({
//       ...prev,
//       [batch.id]: true,
//     }));

//     try {
//       const response = await fetch("/api/developer/pull-requests/review", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           projectId: batch.projectId,
//           requestId: batch.requestId,
//           prInput,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok || !data.ok) {
//         throw new Error(data.error || "Failed to review pull request");
//       }

//
//     } catch (error) {
//       setReviewErrors((prev) => ({
//         ...prev,
//         [batch.id]: error instanceof Error ? error.message : "AI review failed",
//       }));
//     } finally {
//       setReviewLoading((prev) => ({
//         ...prev,
//         [batch.id]: false,
//       }));
//     }
//   }

//   function getVisibleReview(batch: DevelopmentBatch) {
//     const liveResult = reviewResults[batch.id];

//     if (liveResult) {
//       return {
//         status: liveResult.status,
//         review: liveResult.review,
//         changedFiles: liveResult.changedFiles,
//         pullRequestUrl: liveResult.pullRequest?.url,
//         pullRequestTitle: liveResult.pullRequest?.title,
//         pullNumber: liveResult.pullRequest?.number,
//         githubCommentStatus: liveResult.githubComment?.status || "",
//         githubCommentError: liveResult.githubComment?.error || "",
//       };
//     }

//     const savedReview = batch.latestReview;

//     if (savedReview?.review) {
//       return {
//         status: savedReview.status,
//         review: savedReview.review,
//         changedFiles: savedReview.changedFiles || [],
//         pullRequestUrl: savedReview.pullRequestUrl,
//         pullRequestTitle: savedReview.pullRequestTitle,
//         pullNumber: savedReview.pullNumber,
//         githubCommentStatus: "",
//         githubCommentError: "",
//       };
//     }

//     return null;
//   }

//   return (
//     <main className="h-screen overflow-hidden bg-[#111111] text-white">
//       <div className="grid h-screen lg:grid-cols-[20%_80%]">
//         <aside className="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0f0f0f]">
//           {" "}
//           <div className="border-b border-white/10 px-5 py-5">
//             {" "}
//             <LoomLogo size="small" />
//             <p className="mt-10 text-m text-white/40">Developer Portal</p>
//           </div>
//           <div className="flex-1 px-4 py-5">

//             <div className="mb-8 rounded-2xl border border-[#aa4825]/50 bg-[#aa4825]/10 p-4">
//               <p className="text-sm font-semibold text-[#ff8a50]">
//                 {project.name}
//               </p>

//               <p className="mt-2 break-all text-xs text-white/40">
//                 {project.repository || "Repository not connected"}
//               </p>
//             </div>

//             <nav className="space-y-2">
//               <DeveloperSidebarButton
//                 label="Assigned Tasks"
//                 active={activeView === "assigned-tasks"}
//                 onClick={() => setActiveView("assigned-tasks")}
//               />

//               <DeveloperSidebarButton
//                 label="AI Reviews"
//                 active={activeView === "ai-reviews"}
//                 onClick={() => setActiveView("ai-reviews")}
//               />

//               <DeveloperSidebarButton
//                 label="Fix Required"
//                 active={activeView === "fix-required"}
//                 onClick={() => setActiveView("fix-required")}
//               />
//             </nav>
//           </div>
//           <div className="border-t border-white/10 p-4">
//             <div className="rounded-2xl bg-white/5 p-3">
//               <p className="truncate text-sm font-medium text-white">
//                 {sessionUser.name || "Developer"}
//               </p>

//               <p className="mt-1 truncate text-xs text-white/40">
//                 {sessionUser.email}
//               </p>

//               <p className="mt-2 text-xs font-medium text-[#aa4825]">
//                 DEVELOPER
//               </p>
//             </div>
//           </div>
//         </aside>

//         <section className="h-screen overflow-y-auto px-10 py-10">
//           <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
//             <div>
//               <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//                 Assigned development work
//               </p>

//               <h1 className="mt-4 text-4xl font-semibold tracking-tight">
//                 Developer tasks
//               </h1>

//               <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
//                 These tasks were created from PM-approved PRDs for this project.
//                 Implement the task in GitHub, paste the real PR URL, and Loom AI
//                 will analyze the actual changed files.
//               </p>
//             </div>

//             <div className="flex flex-wrap gap-2">
//               <Badge label={`${fixRequiredCount} fix required`} />
//               <Badge label={`${readyForHumanReviewCount} ready`} />
//             </div>
//           </div>

//           <div className="mt-10 space-y-6">
//             {batches.length === 0 ? (
//               <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
//                 No development tasks have been assigned yet.
//               </div>
//             ) : (
//               batches.map((batch) => {
//                 const visibleReview = getVisibleReview(batch);
//                 const isReviewRunning = Boolean(reviewLoading[batch.id]);
//                 const reviewError = reviewErrors[batch.id];

//                 return (
//                   <section
//                     key={batch.id}
//                     className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
//                   >
//                     <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
//                       <div>
//                         <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//                           PM-approved task plan
//                         </p>

//                         <h2 className="mt-4 text-3xl font-semibold text-white">
//                           {batch.title}
//                         </h2>

//                         <p className="mt-2 text-sm text-white/35">
//                           Status: {batch.status}
//                         </p>

//                         <p className="mt-2 text-sm text-white/35">
//                           Repository:{" "}
//                           {batch.repository || "Repository not connected"}
//                         </p>
//                       </div>

//                       <Badge label={`${batch.tasks.length} tasks`} />
//                     </div>

//                     <div className="mt-7 space-y-4">
//                       {batch.tasks.map((task) => (
//                         <article
//                           key={task.id}
//                           className="rounded-2xl border border-white/10 bg-[#101010] p-5"
//                         >
//                           <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
//                             <div>
//                               <h3 className="text-xl font-semibold text-white">
//                                 {task.title}
//                               </h3>

//                               <p className="mt-2 text-sm text-[#ff9c73]">
//                                 Assigned to: {formatOwnerRole(task.ownerRole)}
//                               </p>
//                             </div>

//                             <Badge label={task.status} />
//                           </div>

//                           <div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr]">
//                             <p className="text-sm font-semibold text-white/75">
//                               Task area
//                             </p>

//                             <p className="text-sm leading-7 text-white/50">
//                               {getTaskArea(task)}
//                             </p>

//                             <p className="text-sm font-semibold text-white/75">
//                               Summary
//                             </p>

//                             <p className="text-sm leading-7 text-white/50">
//                               {getTaskSummary(task)}
//                             </p>

//                             <p className="text-sm font-semibold text-white/75">
//                               Work details
//                             </p>

//                             <ul className="space-y-2 text-sm leading-7 text-white/50">
//                               {getTaskPoints(task).map((item, index) => (
//                                 <li key={`${task.id}-work-${index}`}>
//                                   • {item}
//                                 </li>
//                               ))}
//                             </ul>

//                             {Array.isArray(task.affectedFiles) &&
//                               task.affectedFiles.length > 0 && (
//                                 <>
//                                   <p className="text-sm font-semibold text-white/75">
//                                     Likely files
//                                   </p>

//                                   <ul className="space-y-2 text-sm leading-7 text-white/50">
//                                     {task.affectedFiles.map((file) => (
//                                       <li key={file}>• {file}</li>
//                                     ))}
//                                   </ul>
//                                 </>
//                               )}
//                           </div>
//                         </article>
//                       ))}
//                     </div>

//                     <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//                       <p className="text-base font-semibold text-white">
//                         Link real GitHub pull request
//                       </p>

//                       <p className="mt-2 text-sm leading-7 text-white/45">
//                         Paste the PR created for this task plan. Loom will fetch
//                         real changed files from GitHub using Octokit and send
//                         the actual diff to the AI reviewer.
//                       </p>

//                       <input
//                         value={prInputs[batch.id] || ""}
//                         onChange={(event) =>
//                           setPrInputs((prev) => ({
//                             ...prev,
//                             [batch.id]: event.target.value,
//                           }))
//                         }
//                         placeholder="https://github.com/owner/repo/pull/12 or owner/repo#12"
//                         className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#aa4825]/70"
//                       />

//                       {reviewError ? (
//                         <p className="mt-3 text-sm text-red-200">
//                           {reviewError}
//                         </p>
//                       ) : null}

//                       <button
//                         type="button"
//                         onClick={() => runAiReview(batch)}
//                         disabled={isReviewRunning}
//                         className="mt-4 w-full rounded-xl bg-[#aa4825] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#bd5630] disabled:cursor-not-allowed disabled:opacity-60"
//                       >
//                         {isReviewRunning
//                           ? "Analyzing real GitHub PR..."
//                           : visibleReview?.status === "FIX_REQUIRED"
//                             ? "Run AI Review Again"
//                             : "Run AI Review"}
//                       </button>
//                     </div>

//                     {visibleReview ? (
//                       <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//                         <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
//                           <div>
//                             <p className="text-base font-semibold text-white">
//                               AI Review Result
//                             </p>

//                             {visibleReview.pullRequestUrl ? (
//                               <a
//                                 href={visibleReview.pullRequestUrl}
//                                 target="_blank"
//                                 rel="noreferrer"
//                                 className="mt-2 block text-sm text-[#ff9c73] underline-offset-4 hover:underline"
//                               >
//                                 #{visibleReview.pullNumber || ""}{" "}
//                                 {visibleReview.pullRequestTitle ||
//                                   "Open GitHub Pull Request"}
//                               </a>
//                             ) : null}
//                           </div>

//                           <span
//                             className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
//                               visibleReview.status,
//                             )}`}
//                           >
//                             {getStatusLabel(visibleReview.status)}
//                           </span>
//                         </div>

//                         <p className="mt-4 text-sm leading-7 text-white/55">
//                           {visibleReview.review.summary}
//                         </p>

//                         {visibleReview.status === "FIX_REQUIRED" ? (
//                           <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
//                             <p className="text-sm font-semibold text-red-200">
//                               Fix Required
//                             </p>

//                             <p className="mt-2 text-sm leading-7 text-red-100/70">
//                               Fix these issues in GitHub, push the changes, then
//                               run AI review again. The loop continues until Loom
//                               AI approves the real PR diff.
//                             </p>

//                             <div className="mt-4 space-y-3">
//                               {visibleReview.review.issues.length > 0 ? (
//                                 visibleReview.review.issues.map(
//                                   (issue, index) => (
//                                     <div
//                                       key={`${issue.file || "issue"}-${index}`}
//                                       className="rounded-xl border border-white/10 bg-black/25 p-4"
//                                     >
//                                       <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-200/70">
//                                         {issue.severity}
//                                       </p>

//                                       {issue.file ? (
//                                         <p className="mt-2 text-xs text-white/40">
//                                           {issue.file}
//                                         </p>
//                                       ) : null}

//                                       <p className="mt-3 text-sm leading-7 text-white/75">
//                                         {issue.issue}
//                                       </p>

//                                       <p className="mt-3 text-sm leading-7 text-white/50">
//                                         Recommendation: {issue.recommendation}
//                                       </p>
//                                     </div>
//                                   ),
//                                 )
//                               ) : (
//                                 <p className="text-sm text-white/50">
//                                   AI marked this PR as fix required. Check the
//                                   implementation against the task and run the
//                                   review again after fixes.
//                                 </p>
//                               )}
//                             </div>
//                           </div>
//                         ) : (
//                           <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
//                             <p className="text-sm font-semibold text-emerald-200">
//                               Ready for Senior Technical Review
//                             </p>

//                             <p className="mt-2 text-sm leading-7 text-emerald-100/70">
//                               Loom AI approved this real GitHub PR diff. The
//                               next step is final approval by the Senior
//                               Technical Engineer / Human Reviewer.
//                             </p>

//                             <button
//                               type="button"
//                               disabled
//                               className="mt-4 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-100 opacity-80"
//                             >
//                               Ready for senior engineer
//                             </button>
//                           </div>
//                         )}

//                         <div className="mt-5">
//                           <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
//                             Changed files analyzed
//                           </p>

//                           <div className="mt-3 space-y-2">
//                             {visibleReview.changedFiles.length > 0 ? (
//                               visibleReview.changedFiles.map((file) => (
//                                 <div
//                                   key={file.filename}
//                                   className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55 md:flex-row md:items-center md:justify-between"
//                                 >
//                                   <span>{file.filename}</span>

//                                   <span>
//                                     {file.status} · +{file.additions} -
//                                     {file.deletions} · {file.changes} changes
//                                   </span>
//                                 </div>
//                               ))
//                             ) : (
//                               <p className="text-sm text-white/40">
//                                 No changed file summary found.
//                               </p>
//                             )}
//                           </div>
//                         </div>

//                         {visibleReview.githubCommentStatus === "FAILED" ? (
//                           <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
//                             <p className="text-sm leading-7 text-yellow-100">
//                               AI review completed, but GitHub comment was not
//                               posted: {visibleReview.githubCommentError}
//                             </p>
//                           </div>
//                         ) : null}
//                       </div>
//                     ) : null}
//                   </section>
//                 );
//               })
//             )}
//           </div>
//         </section>
//       </div>
//     </main>
//   );
// }

// function Badge({ label }: { label: string }) {
//   return (
//     <span className="rounded-full border border-[#aa4825]/40 bg-[#aa4825]/10 px-3 py-1 text-xs text-[#ff8a50]">
//       {label}
//     </span>
//   );
// }

// function DeveloperSidebarButton({
//   label,
//   active,
//   onClick,
// }: {
//   label: string;
//   active: boolean;
//   onClick: () => void;
// }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       className={
//         active
//           ? "w-full rounded-xl bg-white/10 px-5 py-4 text-left text-sm font-semibold text-white"
//           : "w-full rounded-xl px-5 py-4 text-left text-sm font-semibold text-white/45 transition hover:bg-white/[0.04] hover:text-white/70"
//       }
//     >
//       {label}
//     </button>
//   );
// }

// "use client";

// import { useMemo, useState } from "react";
// import { LoomLogo } from "@/components/brand/loom-logo";

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

// type ReviewIssue = {
//   severity: "BLOCKING" | "NON_BLOCKING";
//   file?: string;
//   issue: string;
//   recommendation: string;
// };

// type AiReviewResult = {
//   status: "FIX_REQUIRED" | "AI_APPROVED";
//   summary: string;
//   issues: ReviewIssue[];
// };

// type ChangedFile = {
//   filename: string;
//   status: string;
//   additions: number;
//   deletions: number;
//   changes: number;
// };

// type ReviewResponse = {
//   ok: boolean;
//   status: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
//   review: AiReviewResult;
//   pullRequest: {
//     id?: string;
//     number: number;
//     title: string;
//     state: string;
//     url: string;
//   };
//   changedFiles: ChangedFile[];
//   githubComment?: {
//     status: string;
//     error?: string;
//   };
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
//   changedFiles?: ChangedFile[];
//   review?: AiReviewResult;
//   status?: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
//   createdAt?: string;
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

// type DeveloperReviewClientProps = {
//   project: {
//     id: string;
//     name: string;
//     repository: string;
//   };
//   sessionUser: {
//     name: string;
//     email: string;
//   };
//   initialBatches: DevelopmentBatch[];
// };

// function getTaskPoints(task: DevelopmentTask) {
//   if (Array.isArray(task.workItems) && task.workItems.length > 0) {
//     return task.workItems;
//   }

//   if (
//     Array.isArray(task.acceptanceCriteria) &&
//     task.acceptanceCriteria.length > 0
//   ) {
//     return task.acceptanceCriteria;
//   }

//   return ["Complete the task according to the PM-approved requirement."];
// }

// function getTaskSummary(task: DevelopmentTask) {
//   return task.summary || task.reason || "No task summary provided.";
// }

// function getTaskArea(task: DevelopmentTask) {
//   return task.area || "Development task";
// }

// function formatOwnerRole(role: string) {
//   return role
//     .replace(/_/g, " ")
//     .toLowerCase()
//     .replace(/\b\w/g, (char) => char.toUpperCase());
// }

// function getStatusLabel(status?: string) {
//   if (status === "READY_FOR_HUMAN_REVIEW") {
//     return "Ready for senior technical review";
//   }

//   if (status === "FIX_REQUIRED") {
//     return "Fix required";
//   }

//   return "Awaiting AI review";
// }

// function getStatusClass(status?: string) {
//   if (status === "READY_FOR_HUMAN_REVIEW") {
//     return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
//   }

//   if (status === "FIX_REQUIRED") {
//     return "border-red-500/30 bg-red-500/10 text-red-200";
//   }

//   return "border-[#aa4825]/40 bg-[#aa4825]/10 text-[#ff8a50]";
// }

// function getTaskId(task: DevelopmentTask, index: number) {
//   return task.id || `task-${index}`;
// }

// export default function DeveloperReviewClient({
//   project,
//   sessionUser,
//   initialBatches,
// }: DeveloperReviewClientProps) {
//   const [prInputs, setPrInputs] = useState<Record<string, string>>({});
//   const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
//   const [reviewResults, setReviewResults] = useState<
//     Record<string, ReviewResponse>
//   >({});

//   const [expandedTaskByBatch, setExpandedTaskByBatch] = useState<
//     Record<string, string | null>
//   >({});

//   const [activeView, setActiveView] = useState<
//     "assigned-tasks" | "ai-reviews" | "fix-required"
//   >("assigned-tasks");

//   const batches = initialBatches;

//   const fixRequiredCount = useMemo(() => {
//     return batches.filter((batch) => {
//       const liveResult = reviewResults[batch.id];

//       if (liveResult) {
//         return liveResult.status === "FIX_REQUIRED";
//       }

//       return batch.latestReview?.status === "FIX_REQUIRED";
//     }).length;
//   }, [batches, reviewResults]);

//   const readyForHumanReviewCount = useMemo(() => {
//     return batches.filter((batch) => {
//       const liveResult = reviewResults[batch.id];

//       if (liveResult) {
//         return liveResult.status === "READY_FOR_HUMAN_REVIEW";
//       }

//       return batch.latestReview?.status === "READY_FOR_HUMAN_REVIEW";
//     }).length;
//   }, [batches, reviewResults]);

//   async function runAiReview(batch: DevelopmentBatch) {
//     const prInput = prInputs[batch.id]?.trim();

//     if (!prInput) {
//       setReviewErrors((prev) => ({
//         ...prev,
//         [batch.id]: "Paste a real GitHub pull request URL first.",
//       }));
//       return;
//     }

//     setReviewErrors((prev) => ({
//       ...prev,
//       [batch.id]: "",
//     }));

//     setReviewLoading((prev) => ({
//       ...prev,
//       [batch.id]: true,
//     }));

//     try {
//       const response = await fetch("/api/developer/pull-requests/review", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           projectId: batch.projectId,
//           requestId: batch.requestId,
//           prInput,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok || !data.ok) {
//         throw new Error(data.error || "Failed to review pull request");
//       }

//

//     } catch (error) {
//       setReviewErrors((prev) => ({
//         ...prev,
//         [batch.id]: error instanceof Error ? error.message : "AI review failed",
//       }));
//     } finally {
//       setReviewLoading((prev) => ({
//         ...prev,
//         [batch.id]: false,
//       }));
//     }
//   }

//   function getVisibleReview(batch: DevelopmentBatch) {
//     const liveResult = reviewResults[batch.id];

//     if (liveResult) {
//       return {
//         status: liveResult.status,
//         review: liveResult.review,
//         changedFiles: liveResult.changedFiles,
//         pullRequestUrl: liveResult.pullRequest?.url,
//         pullRequestTitle: liveResult.pullRequest?.title,
//         pullNumber: liveResult.pullRequest?.number,
//         githubCommentStatus: liveResult.githubComment?.status || "",
//         githubCommentError: liveResult.githubComment?.error || "",
//       };
//     }

//     const savedReview = batch.latestReview;

//     if (savedReview?.review) {
//       return {
//         status: savedReview.status,
//         review: savedReview.review,
//         changedFiles: savedReview.changedFiles || [],
//         pullRequestUrl: savedReview.pullRequestUrl,
//         pullRequestTitle: savedReview.pullRequestTitle,
//         pullNumber: savedReview.pullNumber,
//         githubCommentStatus: "",
//         githubCommentError: "",
//       };
//     }

//     return null;
//   }

//   return (
//     <main className="h-screen overflow-hidden bg-[#111111] text-white">
//       <div className="grid h-screen lg:grid-cols-[20%_80%]">
//         <aside className="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0f0f0f]">
//           {" "}
//           <div className="border-b border-white/10 px-5 py-5">
//             {" "}
//             <LoomLogo size="small" />
//             <p className="mt-10 text-m text-white/40">Developer Portal</p>
//           </div>
//           <div className="flex-1 px-4 py-5">
//             <div className="mb-8 rounded-2xl border border-[#aa4825]/50 bg-[#aa4825]/10 p-4">
//               <p className="text-sm font-semibold text-[#ff8a50]">
//                 {project.name}
//               </p>

//               <p className="mt-2 break-all text-xs text-white/40">
//                 {project.repository || "Repository not connected"}
//               </p>
//             </div>

//             <nav className="space-y-2">
//               <DeveloperSidebarButton
//                 label="Assigned Tasks"
//                 active={activeView === "assigned-tasks"}
//                 onClick={() => setActiveView("assigned-tasks")}
//               />

//               <DeveloperSidebarButton
//                 label="AI Reviews"
//                 active={activeView === "ai-reviews"}
//                 onClick={() => setActiveView("ai-reviews")}
//               />

//               <DeveloperSidebarButton
//                 label="Fix Required"
//                 active={activeView === "fix-required"}
//                 onClick={() => setActiveView("fix-required")}
//               />
//             </nav>
//           </div>
//           <div className="border-t border-white/10 p-4">
//             <div className="rounded-2xl bg-white/5 p-3">
//               <p className="truncate text-sm font-medium text-white">
//                 {sessionUser.name || "Developer"}
//               </p>

//               <p className="mt-1 truncate text-xs text-white/40">
//                 {sessionUser.email}
//               </p>

//               <p className="mt-2 text-xs font-medium text-[#aa4825]">
//                 DEVELOPER
//               </p>
//             </div>
//           </div>
//         </aside>

//         <section className="h-screen overflow-y-auto px-10 py-10">
//           <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
//             <div>
//               <p className="text-lg font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//                 Developer tasks
//               </p>

//             </div>

//           </div>

//           <div className="mt-10 space-y-6">
//             {batches.length === 0 ? (
//               <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
//                 No development tasks have been assigned yet.
//               </div>
//             ) : (
//               batches.map((batch) => {
//                 const visibleReview = getVisibleReview(batch);
//                 const isReviewRunning = Boolean(reviewLoading[batch.id]);
//                 const reviewError = reviewErrors[batch.id];

//                 return (
//                   <section
//                     key={batch.id}
//                     className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
//                   >
//                     <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
//                       <div>

//                         <h2 className="mt-4 text-3xl font-semibold text-white">
//                           {batch.title}
//                         </h2>

//                       </div>

//                     </div>

//                     <div className="mt-7">
//                       <div className="mb-3 flex items-center justify-between">
//                         <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
//                           Assigned tasks
//                         </p>

//                         <p className="text-xs text-white/35">
//                           Click a task to view full details
//                         </p>
//                       </div>

//                       {batch.tasks.length > 0 ? (
//                         <div className="space-y-3">
//                           {batch.tasks.map((task, index) => {
//                             const taskId = getTaskId(task, index);
//                             const isExpanded =
//                               expandedTaskByBatch[batch.id] === taskId;

//                             return (
//                               <article
//                                 key={taskId}
//                                 className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]"
//                               >
//                                 <button
//                                   type="button"
//                                   onClick={() =>
//                                     setExpandedTaskByBatch((prev) => ({
//                                       ...prev,
//                                       [batch.id]: isExpanded ? null : taskId,
//                                     }))
//                                   }
//                                   className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/[0.03]"
//                                 >
//                                   <div className="min-w-0">
//                                     <p className="text-lg font-semibold text-white">
//                                       {task.title}
//                                     </p>

//                                     <p className="mt-2 text-sm text-[#ff9c73]">
//                                       Assigned to:{" "}
//                                       {formatOwnerRole(task.ownerRole)}
//                                     </p>

//                                     <p className="mt-2 truncate text-sm text-white/40">
//                                       {getTaskSummary(task)}
//                                     </p>
//                                   </div>

//                                   <div className="flex shrink-0 items-center gap-3">

//                                     <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm text-white/60">
//                                       {isExpanded ? "▲" : "▼"}
//                                     </span>
//                                   </div>
//                                 </button>

//                                 {isExpanded ? (
//                                   <div className="border-t border-white/10 px-5 py-5">
//                                     <div className="grid gap-4 md:grid-cols-[180px_1fr]">
//                                       <p className="text-sm font-semibold text-white/75">
//                                         Task area
//                                       </p>

//                                       <p className="text-sm leading-7 text-white/50">
//                                         {getTaskArea(task)}
//                                       </p>

//                                       <p className="text-sm font-semibold text-white/75">
//                                         Summary
//                                       </p>

//                                       <p className="text-sm leading-7 text-white/50">
//                                         {getTaskSummary(task)}
//                                       </p>

//                                       <p className="text-sm font-semibold text-white/75">
//                                         Work details
//                                       </p>

//                                       <ul className="space-y-2 text-sm leading-7 text-white/50">
//                                         {getTaskPoints(task).map(
//                                           (item, itemIndex) => (
//                                             <li
//                                               key={`${taskId}-work-${itemIndex}`}
//                                             >
//                                               • {item}
//                                             </li>
//                                           ),
//                                         )}
//                                       </ul>

//                                       {Array.isArray(task.affectedFiles) &&
//                                         task.affectedFiles.length > 0 && (
//                                           <>
//                                             <p className="text-sm font-semibold text-white/75">
//                                               Likely files
//                                             </p>

//                                             <ul className="space-y-2 text-sm leading-7 text-white/50">
//                                               {task.affectedFiles.map(
//                                                 (file) => (
//                                                   <li key={file}>• {file}</li>
//                                                 ),
//                                               )}
//                                             </ul>
//                                           </>
//                                         )}
//                                     </div>
//                                   </div>
//                                 ) : null}
//                               </article>
//                             );
//                           })}
//                         </div>
//                       ) : (
//                         <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 text-sm text-white/45">
//                           No task cards found inside this batch.
//                         </div>
//                       )}
//                     </div>

//                     <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//                       <p className="text-base font-semibold text-white">
//                         Link real GitHub pull request
//                       </p>

//                       <p className="mt-2 text-sm leading-7 text-white/45">
//                         Paste the PR created for this task plan. Loom will fetch
//                         real changed files from GitHub using Octokit and send
//                         the actual diff to the AI reviewer.
//                       </p>

//                       <input
//                         value={prInputs[batch.id] || ""}
//                         onChange={(event) =>
//                           setPrInputs((prev) => ({
//                             ...prev,
//                             [batch.id]: event.target.value,
//                           }))
//                         }
//                         placeholder="https://github.com/owner/repo/pull/12 or owner/repo#12"
//                         className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#aa4825]/70"
//                       />

//                       {reviewError ? (
//                         <p className="mt-3 text-sm text-red-200">
//                           {reviewError}
//                         </p>
//                       ) : null}

//                       <button
//                         type="button"
//                         onClick={() => runAiReview(batch)}
//                         disabled={isReviewRunning}
//                         className="mt-4 w-full rounded-xl bg-[#aa4825] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#bd5630] disabled:cursor-not-allowed disabled:opacity-60"
//                       >
//                         {isReviewRunning
//                           ? "Analyzing real GitHub PR..."
//                           : visibleReview?.status === "FIX_REQUIRED"
//                             ? "Run AI Review Again"
//                             : "Run AI Review"}
//                       </button>
//                     </div>

//                     {visibleReview ? (
//                       <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//                         <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
//                           <div>
//                             <p className="text-base font-semibold text-white">
//                               AI Review Result
//                             </p>

//                             {visibleReview.pullRequestUrl ? (
//                               <a
//                                 href={visibleReview.pullRequestUrl}
//                                 target="_blank"
//                                 rel="noreferrer"
//                                 className="mt-2 block text-sm text-[#ff9c73] underline-offset-4 hover:underline"
//                               >
//                                 #{visibleReview.pullNumber || ""}{" "}
//                                 {visibleReview.pullRequestTitle ||
//                                   "Open GitHub Pull Request"}
//                               </a>
//                             ) : null}
//                           </div>

//                           <span
//                             className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
//                               visibleReview.status,
//                             )}`}
//                           >
//                             {getStatusLabel(visibleReview.status)}
//                           </span>
//                         </div>

//                         <p className="mt-4 text-sm leading-7 text-white/55">
//                           {visibleReview.review.summary}
//                         </p>

//                         {visibleReview.status === "FIX_REQUIRED" ? (
//                           <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
//                             <p className="text-sm font-semibold text-red-200">
//                               Fix Required
//                             </p>

//                             <p className="mt-2 text-sm leading-7 text-red-100/70">
//                               Fix these issues in GitHub, push the changes, then
//                               run AI review again. The loop continues until Loom
//                               AI approves the real PR diff.
//                             </p>

//                             <div className="mt-4 space-y-3">
//                               {visibleReview.review.issues.length > 0 ? (
//                                 visibleReview.review.issues.map(
//                                   (issue, index) => (
//                                     <div
//                                       key={`${issue.file || "issue"}-${index}`}
//                                       className="rounded-xl border border-white/10 bg-black/25 p-4"
//                                     >
//                                       <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-200/70">
//                                         {issue.severity}
//                                       </p>

//                                       {issue.file ? (
//                                         <p className="mt-2 text-xs text-white/40">
//                                           {issue.file}
//                                         </p>
//                                       ) : null}

//                                       <p className="mt-3 text-sm leading-7 text-white/75">
//                                         {issue.issue}
//                                       </p>

//                                       <p className="mt-3 text-sm leading-7 text-white/50">
//                                         Recommendation: {issue.recommendation}
//                                       </p>
//                                     </div>
//                                   ),
//                                 )
//                               ) : (
//                                 <p className="text-sm text-white/50">
//                                   AI marked this PR as fix required. Check the
//                                   implementation against the task and run the
//                                   review again after fixes.
//                                 </p>
//                               )}
//                             </div>
//                           </div>
//                         ) : (
//                           <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
//                             <p className="text-sm font-semibold text-emerald-200">
//                               Ready for Senior Technical Review
//                             </p>

//                             <p className="mt-2 text-sm leading-7 text-emerald-100/70">
//                               Loom AI approved this real GitHub PR diff. The
//                               next step is final approval by the Senior
//                               Technical Engineer / Human Reviewer.
//                             </p>

//                             <button
//                               type="button"
//                               disabled
//                               className="mt-4 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-100 opacity-80"
//                             >
//                               Ready for senior engineer
//                             </button>
//                           </div>
//                         )}

//                         <div className="mt-5">
//                           <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
//                             Changed files analyzed
//                           </p>

//                           <div className="mt-3 space-y-2">
//                             {visibleReview.changedFiles.length > 0 ? (
//                               visibleReview.changedFiles.map((file) => (
//                                 <div
//                                   key={file.filename}
//                                   className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55 md:flex-row md:items-center md:justify-between"
//                                 >
//                                   <span>{file.filename}</span>

//                                   <span>
//                                     {file.status} · +{file.additions} -
//                                     {file.deletions} · {file.changes} changes
//                                   </span>
//                                 </div>
//                               ))
//                             ) : (
//                               <p className="text-sm text-white/40">
//                                 No changed file summary found.
//                               </p>
//                             )}
//                           </div>
//                         </div>

//                         {visibleReview.githubCommentStatus === "FAILED" ? (
//                           <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
//                             <p className="text-sm leading-7 text-yellow-100">
//                               AI review completed, but GitHub comment was not
//                               posted: {visibleReview.githubCommentError}
//                             </p>
//                           </div>
//                         ) : null}
//                       </div>
//                     ) : null}
//                   </section>
//                 );
//               })
//             )}
//           </div>
//         </section>
//       </div>
//     </main>
//   );
// }

// function Badge({ label }: { label: string }) {
//   return (
//     <span className="rounded-full border border-[#aa4825]/40 bg-[#aa4825]/10 px-3 py-1 text-xs text-[#ff8a50]">
//       {label}
//     </span>
//   );
// }

// function DeveloperSidebarButton({
//   label,
//   active,
//   onClick,
// }: {
//   label: string;
//   active: boolean;
//   onClick: () => void;
// }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       className={
//         active
//           ? "w-full rounded-xl bg-white/10 px-5 py-4 text-left text-sm font-semibold text-white"
//           : "w-full rounded-xl px-5 py-4 text-left text-sm font-semibold text-white/45 transition hover:bg-white/[0.04] hover:text-white/70"
//       }
//     >
//       {label}
//     </button>
//   );
// }

// "use client";

// import { useEffect, useMemo, useState } from "react";
// import type { Dispatch, SetStateAction } from "react";
// import { LoomLogo } from "@/components/brand/loom-logo";

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

// type ReviewIssue = {
//   severity: "BLOCKING" | "NON_BLOCKING";
//   file?: string;
//   issue: string;
//   recommendation: string;
// };

// type AiReviewResult = {
//   status: "FIX_REQUIRED" | "AI_APPROVED";
//   summary: string;
//   issues: ReviewIssue[];
// };

// type ChangedFile = {
//   filename: string;
//   status: string;
//   additions: number;
//   deletions: number;
//   changes: number;
// };

// type ReviewResponse = {
//   ok: boolean;
//   status: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
//   review: AiReviewResult;
//   pullRequest: {
//     id?: string;
//     number: number;
//     title: string;
//     state: string;
//     url: string;
//   };
//   changedFiles: ChangedFile[];
//   githubComment?: {
//     status: string;
//     error?: string;
//   };
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
//   changedFiles?: ChangedFile[];
//   review?: AiReviewResult;
//   status?: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
//   createdAt?: string;
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

// type DeveloperReviewClientProps = {
//   project: {
//     id: string;
//     name: string;
//     repository: string;
//   };
//   sessionUser: {
//     name: string;
//     email: string;
//   };
//   initialBatches: DevelopmentBatch[];
// };

// type ActiveView = "assigned-tasks" | "ai-reviews" | "fix-required";

// type ReviewTarget = {
//   batchId: string;
//   taskId: string;
// };

// type VisibleReview = {
//   status: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
//   review: AiReviewResult;
//   changedFiles: ChangedFile[];
//   pullRequestUrl?: string;
//   pullRequestTitle?: string;
//   pullNumber?: number;
//   githubCommentStatus?: string;
//   githubCommentError?: string;
// };

// function getTaskPoints(task: DevelopmentTask) {
//   if (Array.isArray(task.workItems) && task.workItems.length > 0) {
//     return task.workItems;
//   }

//   if (
//     Array.isArray(task.acceptanceCriteria) &&
//     task.acceptanceCriteria.length > 0
//   ) {
//     return task.acceptanceCriteria;
//   }

//   return ["Complete the task according to the PM-approved requirement."];
// }

// function getTaskSummary(task: DevelopmentTask) {
//   return task.summary || task.reason || "No task summary provided.";
// }

// function getTaskArea(task: DevelopmentTask) {
//   return task.area || "Development task";
// }

// function formatOwnerRole(role: string) {
//   return role
//     .replace(/_/g, " ")
//     .toLowerCase()
//     .replace(/\b\w/g, (char) => char.toUpperCase());
// }

// function getStatusLabel(status?: string) {
//   if (status === "READY_FOR_HUMAN_REVIEW") {
//     return "Ready for senior technical review";
//   }

//   if (status === "FIX_REQUIRED") {
//     return "Fix required";
//   }

//   return "Awaiting AI review";
// }

// function getStatusClass(status?: string) {
//   if (status === "READY_FOR_HUMAN_REVIEW") {
//     return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
//   }

//   if (status === "FIX_REQUIRED") {
//     return "border-red-500/30 bg-red-500/10 text-red-200";
//   }

//   return "border-[#aa4825]/40 bg-[#aa4825]/10 text-[#ff8a50]";
// }

// function getTaskId(task: DevelopmentTask, index: number) {
//   return task.id || `task-${index}`;
// }

// function safeParseJson<T>(value: string | null): T | null {
//   if (!value) return null;

//   try {
//     return JSON.parse(value) as T;
//   } catch {
//     return null;
//   }
// }

// export default function DeveloperReviewClient({
//   project,
//   sessionUser,
//   initialBatches,
// }: DeveloperReviewClientProps) {
//   const batches = initialBatches;
//   const storagePrefix = `loom-dev-review:${project.id}`;

//   const [activeView, setActiveView] = useState<ActiveView>("assigned-tasks");

//   const [expandedTaskByBatch, setExpandedTaskByBatch] = useState<
//     Record<string, string | null>
//   >({});

//   const [selectedReviewTarget, setSelectedReviewTarget] =
//     useState<ReviewTarget | null>(null);

//   const [prInputs, setPrInputs] = useState<Record<string, string>>({});
//   const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
//   const [reviewResults, setReviewResults] = useState<
//     Record<string, ReviewResponse>
//   >({});

//   useEffect(() => {
//     const savedView = window.localStorage.getItem(
//       `${storagePrefix}:active-view`,
//     ) as ActiveView | null;

//     const savedTarget = safeParseJson<ReviewTarget>(
//       window.localStorage.getItem(`${storagePrefix}:selected-target`),
//     );

//     const savedInputs = safeParseJson<Record<string, string>>(
//       window.localStorage.getItem(`${storagePrefix}:pr-inputs`),
//     );

//     const savedResults = safeParseJson<Record<string, ReviewResponse>>(
//       window.localStorage.getItem(`${storagePrefix}:review-results`),
//     );

//     if (
//       savedView === "assigned-tasks" ||
//       savedView === "ai-reviews" ||
//       savedView === "fix-required"
//     ) {
//       setActiveView(savedView);
//     }

//     if (savedTarget) {
//       setSelectedReviewTarget(savedTarget);
//     }

//     if (savedInputs) {
//       setPrInputs(savedInputs);
//     }

//     if (savedResults) {
//       setReviewResults(savedResults);
//     }
//   }, [storagePrefix]);

//   useEffect(() => {
//     window.localStorage.setItem(`${storagePrefix}:active-view`, activeView);
//   }, [activeView, storagePrefix]);

//   useEffect(() => {
//     window.localStorage.setItem(
//       `${storagePrefix}:selected-target`,
//       JSON.stringify(selectedReviewTarget),
//     );
//   }, [selectedReviewTarget, storagePrefix]);

//   useEffect(() => {
//     window.localStorage.setItem(
//       `${storagePrefix}:pr-inputs`,
//       JSON.stringify(prInputs),
//     );
//   }, [prInputs, storagePrefix]);

//   useEffect(() => {
//     window.localStorage.setItem(
//       `${storagePrefix}:review-results`,
//       JSON.stringify(reviewResults),
//     );
//   }, [reviewResults, storagePrefix]);

//   function getReviewKey(
//     batch: DevelopmentBatch,
//     task: DevelopmentTask,
//     taskIndex: number,
//   ) {
//     return `${batch.id}:${getTaskId(task, taskIndex)}`;
//   }

//   function findSelectedTarget(target: ReviewTarget | null) {
//     if (!target) return null;

//     const batch = batches.find((item) => item.id === target.batchId);

//     if (!batch) return null;

//     const taskIndex = batch.tasks.findIndex(
//       (task, index) => getTaskId(task, index) === target.taskId,
//     );

//     if (taskIndex === -1) return null;

//     return {
//       batch,
//       task: batch.tasks[taskIndex],
//       taskIndex,
//     };
//   }

//   function getVisibleReview(
//     batch: DevelopmentBatch,
//     task: DevelopmentTask,
//     taskIndex: number,
//   ): VisibleReview | null {
//     const reviewKey = getReviewKey(batch, task, taskIndex);
//     const liveResult = reviewResults[reviewKey];

//     if (!liveResult) return null;

//     return {
//       status: liveResult.status,
//       review: liveResult.review,
//       changedFiles: liveResult.changedFiles,
//       pullRequestUrl: liveResult.pullRequest?.url,
//       pullRequestTitle: liveResult.pullRequest?.title,
//       pullNumber: liveResult.pullRequest?.number,
//       githubCommentStatus: liveResult.githubComment?.status || "",
//       githubCommentError: liveResult.githubComment?.error || "",
//     };
//   }

//   const reviewedTaskItems = useMemo(() => {
//     return batches.flatMap((batch) =>
//       batch.tasks
//         .map((task, taskIndex) => {
//           const visibleReview = getVisibleReview(batch, task, taskIndex);

//           return {
//             batch,
//             task,
//             taskIndex,
//             visibleReview,
//           };
//         })
//         .filter((item) => Boolean(item.visibleReview)),
//     );
//   }, [batches, reviewResults]);

//   const fixRequiredItems = useMemo(() => {
//     return reviewedTaskItems.filter(
//       (item) => item.visibleReview?.status === "FIX_REQUIRED",
//     );
//   }, [reviewedTaskItems]);

//   const fixRequiredCount = fixRequiredItems.length;

//   const readyForHumanReviewCount = reviewedTaskItems.filter(
//     (item) => item.visibleReview?.status === "READY_FOR_HUMAN_REVIEW",
//   ).length;

//   const selectedReview = findSelectedTarget(selectedReviewTarget);

//   function openAiReview(
//     batch: DevelopmentBatch,
//     task: DevelopmentTask,
//     taskIndex: number,
//   ) {
//     setSelectedReviewTarget({
//       batchId: batch.id,
//       taskId: getTaskId(task, taskIndex),
//     });

//     setActiveView("ai-reviews");
//   }

//   function openBatchAiReview(batch: DevelopmentBatch) {
//     if (batch.tasks.length === 0) return;

//     const expandedTaskId = expandedTaskByBatch[batch.id];

//     const taskIndex = expandedTaskId
//       ? batch.tasks.findIndex(
//           (task, index) => getTaskId(task, index) === expandedTaskId,
//         )
//       : 0;

//     const safeTaskIndex = taskIndex >= 0 ? taskIndex : 0;
//     const task = batch.tasks[safeTaskIndex];

//     openAiReview(batch, task, safeTaskIndex);
//   }

//   async function runAiReview(
//     batch: DevelopmentBatch,
//     task: DevelopmentTask,
//     taskIndex: number,
//   ) {
//     const reviewKey = getReviewKey(batch, task, taskIndex);
//     const prInput = prInputs[reviewKey]?.trim();

//     if (!prInput) {
//       setReviewErrors((prev) => ({
//         ...prev,
//         [reviewKey]: "Paste a real GitHub pull request URL first.",
//       }));
//       return;
//     }

//     setReviewErrors((prev) => ({
//       ...prev,
//       [reviewKey]: "",
//     }));

//     setReviewLoading((prev) => ({
//       ...prev,
//       [reviewKey]: true,
//     }));

//     try {
//       const response = await fetch("/api/developer/pull-requests/review", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           projectId: batch.projectId,
//           requestId: batch.requestId,
//           taskId: getTaskId(task, taskIndex),
//           taskTitle: task.title,
//           prInput,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok || !data.ok) {
//         throw new Error(data.error || "Failed to review pull request");
//       }

//

//       setSelectedReviewTarget({
//         batchId: batch.id,
//         taskId: getTaskId(task, taskIndex),
//       });

//       setActiveView("ai-reviews");
//     } catch (error) {
//       setReviewErrors((prev) => ({
//         ...prev,
//         [reviewKey]:
//           error instanceof Error ? error.message : "AI review failed",
//       }));
//     } finally {
//       setReviewLoading((prev) => ({
//         ...prev,
//         [reviewKey]: false,
//       }));
//     }
//   }

//   return (
//     <main className="h-screen overflow-hidden bg-[#111111] text-white">
//       <div className="grid h-screen lg:grid-cols-[20%_80%]">
//         <aside className="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0f0f0f]">
//           <div className="border-b border-white/10 px-5 py-5">
//             <LoomLogo size="small" />

//             <p className="mt-10 text-m text-white/40">Developer Portal</p>
//           </div>

//           <div className="flex-1 px-4 py-5">
//             <div className="mb-8 rounded-2xl border border-[#aa4825]/50 bg-[#aa4825]/10 p-4">
//               <p className="text-sm font-semibold text-[#ff8a50]">
//                 {project.name}
//               </p>

//               <p className="mt-2 break-all text-xs text-white/40">
//                 {project.repository || "Repository not connected"}
//               </p>
//             </div>

//             <nav className="space-y-2">
//               <DeveloperSidebarButton
//                 label="Assigned Tasks"
//                 active={activeView === "assigned-tasks"}
//                 onClick={() => setActiveView("assigned-tasks")}
//               />

//               <DeveloperSidebarButton
//                 label="AI Reviews"
//                 active={activeView === "ai-reviews"}
//                 onClick={() => setActiveView("ai-reviews")}
//               />

//               <DeveloperSidebarButton
//                 label="Fix Required"
//                 active={activeView === "fix-required"}
//                 onClick={() => setActiveView("fix-required")}
//               />
//             </nav>
//           </div>

//           <div className="border-t border-white/10 p-4">
//             <div className="rounded-2xl bg-white/5 p-3">
//               <p className="truncate text-sm font-medium text-white">
//                 {sessionUser.name || "Developer"}
//               </p>

//               <p className="mt-1 truncate text-xs text-white/40">
//                 {sessionUser.email}
//               </p>

//               <p className="mt-2 text-xs font-medium text-[#aa4825]">
//                 DEVELOPER
//               </p>
//             </div>
//           </div>
//         </aside>

//         <section className="h-screen overflow-y-auto px-10 py-10">
//           {activeView === "assigned-tasks" ? (
//             <>
//               <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
//                 <div>
//                   <p className="text-lg font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//                     Developer tasks
//                   </p>
//                 </div>

//               </div>

//               <div className="mt-10 space-y-6">
//                 {batches.length === 0 ? (
//                   <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
//                     No development tasks have been assigned yet.
//                   </div>
//                 ) : (
//                   batches.map((batch) => (
//                     <section
//                       key={batch.id}
//                       className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
//                     >
//                       <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
//                         <div className="min-w-0">

//                           <div className="mt-4 flex items-center gap-4">
//                             <h2 className="text-3xl font-semibold text-white">
//                               {batch.title}
//                             </h2>

//                           </div>

//                         </div>

//                         <button
//                           type="button"
//                           onClick={() => openBatchAiReview(batch)}
//                           disabled={batch.tasks.length === 0}
//                           className="mt-10 rounded-xl border border-[#aa4825]/40 bg-[#aa4825]/10 px-10 py-3 text-s font-semibold text-[#ff8a50] transition hover:bg-[#aa4825]/20 disabled:cursor-not-allowed disabled:opacity-40 md:mt-12"
//                         >
//                           AI Review
//                         </button>
//                       </div>

//                       <div className="mt-7">
//                         <div className="mb-3 flex items-center justify-between">
//                           <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
//                             Assigned tasks
//                           </p>

//                           <p className="text-xs text-white/35">
//                             Click a task to view full details
//                           </p>
//                         </div>

//                         {batch.tasks.length > 0 ? (
//                           <div className="space-y-3">
//                             {batch.tasks.map((task, taskIndex) => {
//                               const taskId = getTaskId(task, taskIndex);
//                               const isExpanded =
//                                 expandedTaskByBatch[batch.id] === taskId;
//                               const visibleReview = getVisibleReview(
//                                 batch,
//                                 task,
//                                 taskIndex,
//                               );

//                               return (
//                                 <article
//                                   key={taskId}
//                                   className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]"
//                                 >
//                                   <button
//                                     type="button"
//                                     onClick={() =>
//                                       setExpandedTaskByBatch((prev) => ({
//                                         ...prev,
//                                         [batch.id]: isExpanded ? null : taskId,
//                                       }))
//                                     }
//                                     className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/[0.03]"
//                                   >
//                                     <div className="min-w-0">
//                                       <p className="text-lg font-semibold text-white">
//                                         {task.title}
//                                       </p>

//                                       <p className="mt-2 text-sm text-[#d5cac5]">
//                                         Assigned to :{" "}
//                                         {formatOwnerRole(task.ownerRole)}
//                                       </p>

//                                       <p className="mt-2 truncate text-sm text-white/40">
//                                         {getTaskSummary(task)}
//                                       </p>
//                                     </div>

//                                     <div className="flex shrink-0 items-center gap-3">
//                                       {visibleReview?.status ? (
//                                         <span
//                                           className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
//                                             visibleReview.status,
//                                           )}`}
//                                         >
//                                           {getStatusLabel(visibleReview.status)}
//                                         </span>
//                                       ) : null}

//                                       <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm text-white/60">
//                                         {isExpanded ? "▲" : "▼"}
//                                       </span>
//                                     </div>
//                                   </button>

//                                   {isExpanded ? (
//                                     <div className="border-t border-white/10 px-5 py-5">
//                                       <div className="grid gap-4 md:grid-cols-[180px_1fr]">
//                                         <p className="text-sm font-semibold text-white/75">
//                                           Task area
//                                         </p>

//                                         <p className="text-sm leading-7 text-white/50">
//                                           {getTaskArea(task)}
//                                         </p>

//                                         <p className="text-sm font-semibold text-white/75">
//                                           Summary
//                                         </p>

//                                         <p className="text-sm leading-7 text-white/50">
//                                           {getTaskSummary(task)}
//                                         </p>

//                                         <p className="text-sm font-semibold text-white/75">
//                                           Work details
//                                         </p>

//                                         <ul className="space-y-2 text-sm leading-7 text-white/50">
//                                           {getTaskPoints(task).map(
//                                             (item, itemIndex) => (
//                                               <li
//                                                 key={`${taskId}-work-${itemIndex}`}
//                                               >
//                                                 • {item}
//                                               </li>
//                                             ),
//                                           )}
//                                         </ul>

//                                         {Array.isArray(task.affectedFiles) &&
//                                           task.affectedFiles.length > 0 && (
//                                             <>
//                                               <p className="text-sm font-semibold text-white/75">
//                                                 Likely files
//                                               </p>

//                                               <ul className="space-y-2 text-sm leading-7 text-white/50">
//                                                 {task.affectedFiles.map(
//                                                   (file) => (
//                                                     <li key={file}>• {file}</li>
//                                                   ),
//                                                 )}
//                                               </ul>
//                                             </>
//                                           )}
//                                       </div>

//                                       {/* <button
//                                         type="button"
//                                         onClick={() =>
//                                           openAiReview(batch, task, taskIndex)
//                                         }
//                                         className="mt-5 w-full rounded-xl bg-[#aa4825] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#bd5630]"
//                                       >
//                                         AI Review
//                                       </button> */}
//                                     </div>
//                                   ) : null}
//                                 </article>
//                               );
//                             })}
//                           </div>
//                         ) : (
//                           <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 text-sm text-white/45">
//                             No task cards found inside this batch.
//                           </div>
//                         )}
//                       </div>
//                     </section>
//                   ))
//                 )}
//               </div>
//             </>
//           ) : null}

//           {activeView === "ai-reviews" ? (
//             <AiReviewPanel
//               selectedReview={findSelectedTarget(selectedReviewTarget)}
//               prInputs={prInputs}
//               reviewLoading={reviewLoading}
//               reviewErrors={reviewErrors}
//               getReviewKey={getReviewKey}
//               getVisibleReview={getVisibleReview}
//               runAiReview={runAiReview}
//               setPrInputs={setPrInputs}
//             />
//           ) : null}

//           {activeView === "fix-required" ? (
//             <FixRequiredPanel
//               fixRequiredItems={fixRequiredItems}
//               openAiReview={openAiReview}
//             />
//           ) : null}
//         </section>
//       </div>
//     </main>
//   );
// }

// function AiReviewPanel({
//   selectedReview,
//   prInputs,
//   reviewLoading,
//   reviewErrors,
//   getReviewKey,
//   getVisibleReview,
//   runAiReview,
//   setPrInputs,
// }: {
//   selectedReview: {
//     batch: DevelopmentBatch;
//     task: DevelopmentTask;
//     taskIndex: number;
//   } | null;
//   prInputs: Record<string, string>;
//   reviewLoading: Record<string, boolean>;
//   reviewErrors: Record<string, string>;
//   getReviewKey: (
//     batch: DevelopmentBatch,
//     task: DevelopmentTask,
//     index: number,
//   ) => string;
//   getVisibleReview: (
//     batch: DevelopmentBatch,
//     task: DevelopmentTask,
//     index: number,
//   ) => VisibleReview | null;
//   runAiReview: (
//     batch: DevelopmentBatch,
//     task: DevelopmentTask,
//     index: number,
//   ) => Promise<void>;
//   setPrInputs: Dispatch<SetStateAction<Record<string, string>>>;
// }) {
//   if (!selectedReview) {
//     return (
//       <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
//         Select a task from Assigned Tasks, then click AI Review.
//       </div>
//     );
//   }

//   const { batch, task, taskIndex } = selectedReview;
//   const reviewKey = getReviewKey(batch, task, taskIndex);
//   const visibleReview = getVisibleReview(batch, task, taskIndex);
//   const isReviewRunning = Boolean(reviewLoading[reviewKey]);
//   const reviewError = reviewErrors[reviewKey];

//   return (
//     <>
//       <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
//         <div>
//           <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//             AI review
//           </p>

//           <h1 className="mt-4 text-4xl font-semibold tracking-tight">
//             {task.title}
//           </h1>

//           <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
//             Paste the PR for this specific task. If you switch to another task,
//             this AI review page changes to that task.
//           </p>
//         </div>

//         {visibleReview?.status ? (
//           <span
//             className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
//               visibleReview.status,
//             )}`}
//           >
//             {getStatusLabel(visibleReview.status)}
//           </span>
//         ) : null}
//       </div>

//       <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.02] p-7">
//         <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//           Selected task
//         </p>

//         <h2 className="mt-4 text-2xl font-semibold text-white">{task.title}</h2>

//         <p className="mt-2 text-sm text-[#ff9c73]">
//           Assigned to: {formatOwnerRole(task.ownerRole)}
//         </p>

//         <p className="mt-4 text-sm leading-7 text-white/50">
//           {getTaskSummary(task)}
//         </p>

//         <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//           <p className="text-base font-semibold text-white">
//             Link real GitHub pull request
//           </p>

//           <p className="mt-2 text-sm leading-7 text-white/45">
//             Paste the PR created for this task. Loom fetches real changed files
//             from GitHub using Octokit and sends the actual diff to the AI
//             reviewer.
//           </p>

//           <input
//             value={prInputs[reviewKey] || ""}
//             onChange={(event) =>
//               setPrInputs((prev) => ({
//                 ...prev,
//                 [reviewKey]: event.target.value,
//               }))
//             }
//             placeholder="https://github.com/owner/repo/pull/12 or owner/repo#12"
//             className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#aa4825]/70"
//           />

//           {reviewError ? (
//             <p className="mt-3 text-sm text-red-200">{reviewError}</p>
//           ) : null}

//           <button
//             type="button"
//             onClick={() => runAiReview(batch, task, taskIndex)}
//             disabled={isReviewRunning}
//             className="mt-4 w-full rounded-xl bg-[#aa4825] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#bd5630] disabled:cursor-not-allowed disabled:opacity-60"
//           >
//             {isReviewRunning
//               ? "Analyzing real GitHub PR..."
//               : visibleReview?.status === "FIX_REQUIRED"
//                 ? "Run AI Review Again"
//                 : "Run AI Review"}
//           </button>
//         </div>

//         {visibleReview ? (
//           <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//             <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
//               <div>
//                 <p className="text-base font-semibold text-white">
//                   AI Review Result
//                 </p>

//                 {visibleReview.pullRequestUrl ? (
//                   <a
//                     href={visibleReview.pullRequestUrl}
//                     target="_blank"
//                     rel="noreferrer"
//                     className="mt-2 block text-sm text-[#ff9c73] underline-offset-4 hover:underline"
//                   >
//                     #{visibleReview.pullNumber || ""}{" "}
//                     {visibleReview.pullRequestTitle ||
//                       "Open GitHub Pull Request"}
//                   </a>
//                 ) : null}
//               </div>

//               <span
//                 className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
//                   visibleReview.status,
//                 )}`}
//               >
//                 {getStatusLabel(visibleReview.status)}
//               </span>
//             </div>

//             <p className="mt-4 text-sm leading-7 text-white/55">
//               {visibleReview.review.summary}
//             </p>

//             {visibleReview.status === "FIX_REQUIRED" ? (
//               <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
//                 <p className="text-sm font-semibold text-red-200">
//                   Fix Required
//                 </p>

//                 <p className="mt-2 text-sm leading-7 text-red-100/70">
//                   Fix these issues in GitHub, push the changes, then run AI
//                   review again. The loop continues until Loom AI approves the
//                   real PR diff.
//                 </p>

//                 <div className="mt-4 space-y-3">
//                   {visibleReview.review.issues.length > 0 ? (
//                     visibleReview.review.issues.map((issue, index) => (
//                       <div
//                         key={`${issue.file || "issue"}-${index}`}
//                         className="rounded-xl border border-white/10 bg-black/25 p-4"
//                       >
//                         <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-200/70">
//                           {issue.severity}
//                         </p>

//                         {issue.file ? (
//                           <p className="mt-2 text-xs text-white/40">
//                             {issue.file}
//                           </p>
//                         ) : null}

//                         <p className="mt-3 text-sm leading-7 text-white/75">
//                           {issue.issue}
//                         </p>

//                         <p className="mt-3 text-sm leading-7 text-white/50">
//                           Recommendation: {issue.recommendation}
//                         </p>
//                       </div>
//                     ))
//                   ) : (
//                     <p className="text-sm text-white/50">
//                       AI marked this PR as fix required. Check the
//                       implementation against the task and run the review again
//                       after fixes.
//                     </p>
//                   )}
//                 </div>
//               </div>
//             ) : (
//               <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
//                 <p className="text-sm font-semibold text-emerald-200">
//                   Ready for Senior Technical Review
//                 </p>

//                 <p className="mt-2 text-sm leading-7 text-emerald-100/70">
//                   Loom AI approved this real GitHub PR diff. The next step is
//                   final approval by the Senior Technical Engineer / Human
//                   Reviewer.
//                 </p>

//                 <button
//                   type="button"
//                   disabled
//                   className="mt-4 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-100 opacity-80"
//                 >
//                   Ready for senior engineer
//                 </button>
//               </div>
//             )}

//             <div className="mt-5">
//               <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
//                 Changed files analyzed
//               </p>

//               <div className="mt-3 space-y-2">
//                 {visibleReview.changedFiles.length > 0 ? (
//                   visibleReview.changedFiles.map((file) => (
//                     <div
//                       key={file.filename}
//                       className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55 md:flex-row md:items-center md:justify-between"
//                     >
//                       <span>{file.filename}</span>

//                       <span>
//                         {file.status} · +{file.additions} -{file.deletions} ·{" "}
//                         {file.changes} changes
//                       </span>
//                     </div>
//                   ))
//                 ) : (
//                   <p className="text-sm text-white/40">
//                     No changed file summary found.
//                   </p>
//                 )}
//               </div>
//             </div>

//             {visibleReview.githubCommentStatus === "FAILED" ? (
//               <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
//                 <p className="text-sm leading-7 text-yellow-100">
//                   AI review completed, but GitHub comment was not posted:{" "}
//                   {visibleReview.githubCommentError}
//                 </p>
//               </div>
//             ) : null}
//           </div>
//         ) : null}
//       </div>
//     </>
//   );
// }

// function FixRequiredPanel({
//   fixRequiredItems,
//   openAiReview,
// }: {
//   fixRequiredItems: {
//     batch: DevelopmentBatch;
//     task: DevelopmentTask;
//     taskIndex: number;
//     visibleReview: VisibleReview | null;
//   }[];
//   openAiReview: (
//     batch: DevelopmentBatch,
//     task: DevelopmentTask,
//     index: number,
//   ) => void;
// }) {
//   return (
//     <>
//       <div>
//         <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//           Fix required
//         </p>

//         <h1 className="mt-4 text-4xl font-semibold tracking-tight">
//           Fix required tasks
//         </h1>

//         <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
//           These tasks have AI review issues. Open a task review, fix the PR in
//           GitHub, then run AI review again.
//         </p>
//       </div>

//       <div className="mt-10 space-y-3">
//         {fixRequiredItems.length === 0 ? (
//           <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
//             No fix-required tasks right now.
//           </div>
//         ) : (
//           fixRequiredItems.map(({ batch, task, taskIndex, visibleReview }) => (
//             <button
//               key={`${batch.id}:${getTaskId(task, taskIndex)}`}
//               type="button"
//               onClick={() => openAiReview(batch, task, taskIndex)}
//               className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-left transition hover:bg-red-500/15"
//             >
//               <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
//                 <div>
//                   <p className="text-lg font-semibold text-white">
//                     {task.title}
//                   </p>

//                   <p className="mt-2 text-sm text-[#ff9c73]">
//                     {formatOwnerRole(task.ownerRole)}
//                   </p>

//                   <p className="mt-3 text-sm leading-7 text-red-100/60">
//                     {visibleReview?.review.summary || "Open AI review result"}
//                   </p>
//                 </div>

//                 <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200">
//                   Fix required
//                 </span>
//               </div>
//             </button>
//           ))
//         )}
//       </div>
//     </>
//   );
// }

// function Badge({ label }: { label: string }) {
//   return (
//     <span className="rounded-full border border-[#aa4825]/40 bg-[#aa4825]/10 px-3 py-1 text-xs text-[#ff8a50]">
//       {label}
//     </span>
//   );
// }

// function DeveloperSidebarButton({
//   label,
//   active,
//   onClick,
// }: {
//   label: string;
//   active: boolean;
//   onClick: () => void;
// }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       className={
//         active
//           ? "w-full rounded-xl bg-white/10 px-5 py-4 text-left text-sm font-semibold text-white"
//           : "w-full rounded-xl px-5 py-4 text-left text-sm font-semibold text-white/45 transition hover:bg-white/[0.04] hover:text-white/70"
//       }
//     >
//       {label}
//     </button>
//   );
// }

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { LoomLogo } from "@/components/brand/loom-logo";

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

type AiReviewResult = {
  status: "FIX_REQUIRED" | "AI_APPROVED";
  summary: string;
  issues: ReviewIssue[];
};

type ChangedFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
};

type ReviewResponse = {
  ok: boolean;
  status: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
  review: AiReviewResult;
  pullRequest: {
    id?: string;
    number: number;
    title: string;
    state: string;
    url: string;
  };
  changedFiles: ChangedFile[];
  githubComment?: {
    status: string;
    error?: string;
  };
};

type SeniorSummaryResponse = {
  ok: boolean;
  summaryId: string;
  status: "SENT_TO_SENIOR_REVIEW";
  summary: {
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
  createdAt: string;
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
  changedFiles?: ChangedFile[];
  review?: AiReviewResult;
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
  latestReview?: LatestReview | null;
};

type DeveloperReviewClientProps = {
  project: {
    id: string;
    name: string;
    repository: string;
  };
  sessionUser: {
    name: string;
    email: string;
  };
  initialBatches: DevelopmentBatch[];
};

type ActiveView = "assigned-tasks" | "ai-reviews" | "fix-required" | "summary";

type ReviewTarget = {
  batchId: string;
  taskId: string;
};

type VisibleReview = {
  status: "FIX_REQUIRED" | "READY_FOR_HUMAN_REVIEW";
  review: AiReviewResult;
  changedFiles: ChangedFile[];
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  pullNumber?: number;
  githubCommentStatus?: string;
  githubCommentError?: string;
};

type FixRequestRecord = {
  id: string;
  reviewKey: string;
  batchId: string;
  taskId: string;
  taskTitle: string;
  ownerRole: string;
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  pullNumber?: number;
  status: "FIX_REQUIRED";
  summary: string;
  issues: ReviewIssue[];
  changedFiles: ChangedFile[];
  createdAt: string;
};

function getTaskPoints(task: DevelopmentTask) {
  if (Array.isArray(task.workItems) && task.workItems.length > 0) {
    return task.workItems;
  }

  if (
    Array.isArray(task.acceptanceCriteria) &&
    task.acceptanceCriteria.length > 0
  ) {
    return task.acceptanceCriteria;
  }

  return ["Complete the task according to the PM-approved requirement."];
}

function getTaskSummary(task: DevelopmentTask) {
  return task.summary || task.reason || "No task summary provided.";
}

function getTaskArea(task: DevelopmentTask) {
  return task.area || "Development task";
}

function formatOwnerRole(role: string) {
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusLabel(status?: string) {
  if (status === "READY_FOR_HUMAN_REVIEW") {
    return "Ready for senior technical review";
  }

  if (status === "FIX_REQUIRED") {
    return "Fix required";
  }

  return "Awaiting AI review";
}

function getStatusClass(status?: string) {
  if (status === "READY_FOR_HUMAN_REVIEW") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "FIX_REQUIRED") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  return "border-[#aa4825]/40 bg-[#aa4825]/10 text-[#ff8a50]";
}

function getTaskId(task: DevelopmentTask, index: number) {
  return task.id || `task-${index}`;
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export default function DeveloperReviewClient({
  project,
  sessionUser,
  initialBatches,
}: DeveloperReviewClientProps) {
  const batches = initialBatches;
  const storagePrefix = `loom-dev-review:${project.id}`;

  const [activeView, setActiveView] = useState<ActiveView>("assigned-tasks");

  const [expandedTaskByBatch, setExpandedTaskByBatch] = useState<
    Record<string, string | null>
  >({});

  const [selectedReviewTarget, setSelectedReviewTarget] =
    useState<ReviewTarget | null>(null);

  const [prInputs, setPrInputs] = useState<Record<string, string>>({});
  const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [reviewResults, setReviewResults] = useState<
    Record<string, ReviewResponse>
  >({});
  const [fixRequestHistory, setFixRequestHistory] = useState<
    Record<string, FixRequestRecord[]>
  >({});

  const [seniorSummaryLoading, setSeniorSummaryLoading] = useState<
    Record<string, boolean>
  >({});
  const [seniorSummaryErrors, setSeniorSummaryErrors] = useState<
    Record<string, string>
  >({});
  const [seniorSummaries, setSeniorSummaries] = useState<
    Record<string, SeniorSummaryResponse>
  >({});
  const [selectedSummaryKey, setSelectedSummaryKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const savedView = window.localStorage.getItem(
      `${storagePrefix}:active-view`,
    ) as ActiveView | null;

    const savedTarget = safeParseJson<ReviewTarget>(
      window.localStorage.getItem(`${storagePrefix}:selected-target`),
    );

    const savedFixRequestHistory = safeParseJson<
      Record<string, FixRequestRecord[]>
    >(window.localStorage.getItem(`${storagePrefix}:fix-request-history`));

    const savedInputs = safeParseJson<Record<string, string>>(
      window.localStorage.getItem(`${storagePrefix}:pr-inputs`),
    );

    const savedResults = safeParseJson<Record<string, ReviewResponse>>(
      window.localStorage.getItem(`${storagePrefix}:review-results`),
    );

    const savedSeniorSummaries = safeParseJson<
      Record<string, SeniorSummaryResponse>
    >(window.localStorage.getItem(`${storagePrefix}:senior-summaries`));

    const savedSummaryKey = window.localStorage.getItem(
      `${storagePrefix}:selected-summary-key`,
    );

    if (
      savedView === "assigned-tasks" ||
      savedView === "ai-reviews" ||
      savedView === "fix-required" ||
      savedView === "summary"
    ) {
      setActiveView(savedView);
    }

    if (savedTarget) {
      setSelectedReviewTarget(savedTarget);
    }

    if (savedInputs) {
      setPrInputs(savedInputs);
    }

    if (savedResults) {
      setReviewResults(savedResults);
    }

    if (savedFixRequestHistory) {
      setFixRequestHistory(savedFixRequestHistory);
    }

    if (savedSeniorSummaries) {
      setSeniorSummaries(savedSeniorSummaries);
    }

    if (savedSummaryKey) {
      setSelectedSummaryKey(savedSummaryKey);
    }
  }, [storagePrefix]);

  useEffect(() => {
    window.localStorage.setItem(`${storagePrefix}:active-view`, activeView);
  }, [activeView, storagePrefix]);

  useEffect(() => {
    window.localStorage.setItem(
      `${storagePrefix}:fix-request-history`,
      JSON.stringify(fixRequestHistory),
    );
  }, [fixRequestHistory, storagePrefix]);

  useEffect(() => {
    window.localStorage.setItem(
      `${storagePrefix}:selected-target`,
      JSON.stringify(selectedReviewTarget),
    );
  }, [selectedReviewTarget, storagePrefix]);

  useEffect(() => {
    window.localStorage.setItem(
      `${storagePrefix}:pr-inputs`,
      JSON.stringify(prInputs),
    );
  }, [prInputs, storagePrefix]);

  useEffect(() => {
    window.localStorage.setItem(
      `${storagePrefix}:review-results`,
      JSON.stringify(reviewResults),
    );
  }, [reviewResults, storagePrefix]);

  useEffect(() => {
    window.localStorage.setItem(
      `${storagePrefix}:senior-summaries`,
      JSON.stringify(seniorSummaries),
    );
  }, [seniorSummaries, storagePrefix]);

  useEffect(() => {
    if (selectedSummaryKey) {
      window.localStorage.setItem(
        `${storagePrefix}:selected-summary-key`,
        selectedSummaryKey,
      );
    }
  }, [selectedSummaryKey, storagePrefix]);

  function getReviewKey(
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    taskIndex: number,
  ) {
    return `${batch.id}:${getTaskId(task, taskIndex)}`;
  }

  function findSelectedTarget(target: ReviewTarget | null) {
    if (!target) return null;

    const batch = batches.find((item) => item.id === target.batchId);

    if (!batch) return null;

    const taskIndex = batch.tasks.findIndex(
      (task, index) => getTaskId(task, index) === target.taskId,
    );

    if (taskIndex === -1) return null;

    return {
      batch,
      task: batch.tasks[taskIndex],
      taskIndex,
    };
  }

  function getVisibleReview(
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    taskIndex: number,
  ): VisibleReview | null {
    const reviewKey = getReviewKey(batch, task, taskIndex);
    const liveResult = reviewResults[reviewKey];

    if (!liveResult) return null;

    return {
      status: liveResult.status,
      review: liveResult.review,
      changedFiles: liveResult.changedFiles,
      pullRequestUrl: liveResult.pullRequest?.url,
      pullRequestTitle: liveResult.pullRequest?.title,
      pullNumber: liveResult.pullRequest?.number,
      githubCommentStatus: liveResult.githubComment?.status || "",
      githubCommentError: liveResult.githubComment?.error || "",
    };
  }

  const reviewedTaskItems = useMemo(() => {
    return batches.flatMap((batch) =>
      batch.tasks
        .map((task, taskIndex) => {
          const visibleReview = getVisibleReview(batch, task, taskIndex);

          return {
            batch,
            task,
            taskIndex,
            visibleReview,
          };
        })
        .filter((item) => Boolean(item.visibleReview)),
    );
  }, [batches, reviewResults]);

  const fixRequiredItems = useMemo(() => {
    return batches
      .flatMap((batch) =>
        batch.tasks.map((task, taskIndex) => {
          const reviewKey = getReviewKey(batch, task, taskIndex);
          const records = fixRequestHistory[reviewKey] || [];

          if (records.length === 0) {
            return null;
          }

          return {
            batch,
            task,
            taskIndex,
            visibleReview: getVisibleReview(batch, task, taskIndex),
            records,
          };
        }),
      )
      .filter(
        (
          item,
        ): item is {
          batch: DevelopmentBatch;
          task: DevelopmentTask;
          taskIndex: number;
          visibleReview: VisibleReview | null;
          records: FixRequestRecord[];
        } => Boolean(item),
      );
  }, [batches, reviewResults, fixRequestHistory]);

  const fixRequiredCount = fixRequiredItems.reduce(
    (total, item) => total + item.records.length,
    0,
  );

  const readyForHumanReviewCount = reviewedTaskItems.filter(
    (item) => item.visibleReview?.status === "READY_FOR_HUMAN_REVIEW",
  ).length;

  const selectedReview = findSelectedTarget(selectedReviewTarget);

  function openAiReview(
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    taskIndex: number,
  ) {
    setSelectedReviewTarget({
      batchId: batch.id,
      taskId: getTaskId(task, taskIndex),
    });

    setActiveView("ai-reviews");
  }

  function openBatchAiReview(batch: DevelopmentBatch) {
    if (batch.tasks.length === 0) return;

    const expandedTaskId = expandedTaskByBatch[batch.id];

    const taskIndex = expandedTaskId
      ? batch.tasks.findIndex(
          (task, index) => getTaskId(task, index) === expandedTaskId,
        )
      : 0;

    const safeTaskIndex = taskIndex >= 0 ? taskIndex : 0;
    const task = batch.tasks[safeTaskIndex];

    openAiReview(batch, task, safeTaskIndex);
  }

  async function runAiReview(
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    taskIndex: number,
  ) {
    const reviewKey = getReviewKey(batch, task, taskIndex);
    const prInput = prInputs[reviewKey]?.trim();

    if (!prInput) {
      setReviewErrors((prev) => ({
        ...prev,
        [reviewKey]: "Paste a real GitHub pull request URL first.",
      }));
      return;
    }

    setReviewErrors((prev) => ({
      ...prev,
      [reviewKey]: "",
    }));

    setReviewLoading((prev) => ({
      ...prev,
      [reviewKey]: true,
    }));

    try {
      const response = await fetch("/api/developer/pull-requests/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: batch.projectId,
          requestId: batch.requestId,
          prdId: batch.prdId,
          taskId: getTaskId(task, taskIndex),
          taskTitle: task.title,
          taskSummary: getTaskSummary(task),
          taskArea: getTaskArea(task),
          ownerRole: task.ownerRole,
          workItems: getTaskPoints(task),
          acceptanceCriteria: task.acceptanceCriteria || [],
          affectedFiles: task.affectedFiles || [],
          prInput,
        }),
      });

      const data = (await response.json()) as ReviewResponse & {
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to review pull request");
      }

      setReviewResults((prev) => ({
        ...prev,
        [reviewKey]: data,
      }));

      if (data.status === "FIX_REQUIRED") {
        const fixRecord: FixRequestRecord = {
          id: `${reviewKey}:${data.pullRequest?.url || prInput}:${Date.now()}`,
          reviewKey,
          batchId: batch.id,
          taskId: getTaskId(task, taskIndex),
          taskTitle: task.title,
          ownerRole: task.ownerRole,
          pullRequestUrl: data.pullRequest?.url || prInput,
          pullRequestTitle: data.pullRequest?.title || "Pull request",
          pullNumber: data.pullRequest?.number,
          status: "FIX_REQUIRED",
          summary: data.review.summary,
          issues: data.review.issues || [],
          changedFiles: data.changedFiles || [],
          createdAt: new Date().toISOString(),
        };

        setFixRequestHistory((prev) => {
          const existingRecords = prev[reviewKey] || [];

          const duplicateIndex = existingRecords.findIndex(
            (record) =>
              record.pullRequestUrl === fixRecord.pullRequestUrl &&
              record.summary === fixRecord.summary,
          );

          const nextRecords =
            duplicateIndex >= 0
              ? [
                  fixRecord,
                  ...existingRecords.filter(
                    (_, index) => index !== duplicateIndex,
                  ),
                ]
              : [fixRecord, ...existingRecords];

          return {
            ...prev,
            [reviewKey]: nextRecords,
          };
        });
      }

      setSelectedReviewTarget({
        batchId: batch.id,
        taskId: getTaskId(task, taskIndex),
      });

      setActiveView("ai-reviews");
    } catch (error) {
      setReviewErrors((prev) => ({
        ...prev,
        [reviewKey]:
          error instanceof Error ? error.message : "AI review failed",
      }));
    } finally {
      setReviewLoading((prev) => ({
        ...prev,
        [reviewKey]: false,
      }));
    }
  }

  async function sendToSeniorEngineer(
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    taskIndex: number,
    visibleReview: VisibleReview,
  ) {
    const reviewKey = getReviewKey(batch, task, taskIndex);

    setSeniorSummaryErrors((prev) => ({
      ...prev,
      [reviewKey]: "",
    }));

    setSeniorSummaryLoading((prev) => ({
      ...prev,
      [reviewKey]: true,
    }));

    try {
      const response = await fetch(
        "/api/developer/pull-requests/send-to-senior",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: batch.projectId,
            requestId: batch.requestId,
            prdId: batch.prdId,
            taskId: getTaskId(task, taskIndex),
            taskTitle: task.title,
            taskSummary: getTaskSummary(task),
            ownerRole: task.ownerRole,
            currentReview: visibleReview,
          }),
        },
      );

      const responseText = await response.text();

      let data: SeniorSummaryResponse & {
        error?: string;
      };

      try {
        data = JSON.parse(responseText) as SeniorSummaryResponse & {
          error?: string;
        };
      } catch {
        throw new Error(
          "Send-to-senior API returned HTML instead of JSON. Check that /api/developer/pull-requests/send-to-senior/route.ts exists and has no server error.",
        );
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to send to senior engineer");
      }

      setSeniorSummaries((prev) => ({
        ...prev,
        [reviewKey]: data,
      }));

      setSelectedSummaryKey(reviewKey);
      setActiveView("summary");
    } catch (error) {
      setSeniorSummaryErrors((prev) => ({
        ...prev,
        [reviewKey]:
          error instanceof Error
            ? error.message
            : "Failed to send to senior engineer",
      }));
    } finally {
      setSeniorSummaryLoading((prev) => ({
        ...prev,
        [reviewKey]: false,
      }));
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#111111] text-white">
      <div className="grid h-screen lg:grid-cols-[20%_80%]">
        <aside className="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0f0f0f]">
          <div className="border-b border-white/10 px-5 py-5">
            <LoomLogo size="small" />

            <p className="mt-10 text-m text-white/40">Developer Portal</p>
          </div>

          <div className="flex-1 px-4 py-5">
            <div className="mb-8 rounded-2xl border border-[#aa4825]/50 bg-[#aa4825]/10 p-4">
              <p className="text-sm font-semibold text-[#ff8a50]">
                {project.name}
              </p>

              <p className="mt-2 break-all text-xs text-white/40">
                {project.repository || "Repository not connected"}
              </p>
            </div>

            <nav className="space-y-2">
              <DeveloperSidebarButton
                label="Assigned Tasks"
                active={activeView === "assigned-tasks"}
                onClick={() => setActiveView("assigned-tasks")}
              />

              <DeveloperSidebarButton
                label="AI Reviews"
                active={activeView === "ai-reviews"}
                onClick={() => setActiveView("ai-reviews")}
              />

              <DeveloperSidebarButton
                label="Fix Required"
                active={activeView === "fix-required"}
                onClick={() => setActiveView("fix-required")}
              />

              <DeveloperSidebarButton
                label="Summary"
                active={activeView === "summary"}
                onClick={() => setActiveView("summary")}
              />
            </nav>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="truncate text-sm font-medium text-white">
                {sessionUser.name || "Developer"}
              </p>

              <p className="mt-1 truncate text-xs text-white/40">
                {sessionUser.email}
              </p>

              <p className="mt-2 text-xs font-medium text-[#aa4825]">
                DEVELOPER
              </p>
            </div>
          </div>
        </aside>

        <section className="h-screen overflow-y-auto px-10 py-10">
          {activeView === "assigned-tasks" ? (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-lg font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                    Developer tasks
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-6">
                {batches.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
                    No development tasks have been assigned yet.
                  </div>
                ) : (
                  batches.map((batch) => (
                    <section
                      key={batch.id}
                      className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="mt-4 flex items-center gap-4">
                            <h2 className="text-3xl font-semibold text-white">
                              {batch.title}
                            </h2>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openBatchAiReview(batch)}
                          disabled={batch.tasks.length === 0}
                          className="mt-10 rounded-xl border border-[#aa4825]/40 bg-[#aa4825]/10 px-10 py-3 text-s font-semibold text-[#ff8a50] transition hover:bg-[#aa4825]/20 disabled:cursor-not-allowed disabled:opacity-40 md:mt-12"
                        >
                          AI Review
                        </button>
                      </div>

                      <div className="mt-7">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                            Assigned tasks
                          </p>

                          <p className="text-xs text-white/35">
                            Click a task to view full details
                          </p>
                        </div>

                        {batch.tasks.length > 0 ? (
                          <div className="space-y-3">
                            {batch.tasks.map((task, taskIndex) => {
                              const taskId = getTaskId(task, taskIndex);
                              const isExpanded =
                                expandedTaskByBatch[batch.id] === taskId;
                              const visibleReview = getVisibleReview(
                                batch,
                                task,
                                taskIndex,
                              );

                              return (
                                <article
                                  key={taskId}
                                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedTaskByBatch((prev) => ({
                                        ...prev,
                                        [batch.id]: isExpanded ? null : taskId,
                                      }))
                                    }
                                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/[0.03]"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-lg font-semibold text-white">
                                        {task.title}
                                      </p>

                                      <p className="mt-2 text-sm text-[#d5cac5]">
                                        Assigned to :{" "}
                                        {formatOwnerRole(task.ownerRole)}
                                      </p>

                                      <p className="mt-2 truncate text-sm text-white/40">
                                        {getTaskSummary(task)}
                                      </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-3">
                                      {visibleReview?.status ? (
                                        <span
                                          className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
                                            visibleReview.status,
                                          )}`}
                                        >
                                          {getStatusLabel(visibleReview.status)}
                                        </span>
                                      ) : null}

                                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm text-white/60">
                                        {isExpanded ? "▲" : "▼"}
                                      </span>
                                    </div>
                                  </button>

                                  {isExpanded ? (
                                    <div className="border-t border-white/10 px-5 py-5">
                                      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                                        <p className="text-sm font-semibold text-white/75">
                                          Task area
                                        </p>

                                        <p className="text-sm leading-7 text-white/50">
                                          {getTaskArea(task)}
                                        </p>

                                        <p className="text-sm font-semibold text-white/75">
                                          Summary
                                        </p>

                                        <p className="text-sm leading-7 text-white/50">
                                          {getTaskSummary(task)}
                                        </p>

                                        <p className="text-sm font-semibold text-white/75">
                                          Work details
                                        </p>

                                        <ul className="space-y-2 text-sm leading-7 text-white/50">
                                          {getTaskPoints(task).map(
                                            (item, itemIndex) => (
                                              <li
                                                key={`${taskId}-work-${itemIndex}`}
                                              >
                                                • {item}
                                              </li>
                                            ),
                                          )}
                                        </ul>

                                        {Array.isArray(task.affectedFiles) &&
                                          task.affectedFiles.length > 0 && (
                                            <>
                                              <p className="text-sm font-semibold text-white/75">
                                                Likely files
                                              </p>

                                              <ul className="space-y-2 text-sm leading-7 text-white/50">
                                                {task.affectedFiles.map(
                                                  (file) => (
                                                    <li key={file}>• {file}</li>
                                                  ),
                                                )}
                                              </ul>
                                            </>
                                          )}
                                      </div>
                                    </div>
                                  ) : null}
                                </article>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 text-sm text-white/45">
                            No task cards found inside this batch.
                          </div>
                        )}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </>
          ) : null}

          {activeView === "ai-reviews" ? (
            <AiReviewPanel
              selectedReview={findSelectedTarget(selectedReviewTarget)}
              prInputs={prInputs}
              reviewLoading={reviewLoading}
              reviewErrors={reviewErrors}
              getReviewKey={getReviewKey}
              getVisibleReview={getVisibleReview}
              runAiReview={runAiReview}
              setPrInputs={setPrInputs}
              sendToSeniorEngineer={sendToSeniorEngineer}
              seniorSummaryLoading={seniorSummaryLoading}
              seniorSummaryErrors={seniorSummaryErrors}
            />
          ) : null}

          {activeView === "fix-required" ? (
            <FixRequiredPanel
              fixRequiredItems={fixRequiredItems}
              openAiReview={openAiReview}
            />
          ) : null}

          {activeView === "summary" ? (
            <SeniorSummaryPanel
              seniorSummaries={seniorSummaries}
              selectedSummaryKey={selectedSummaryKey}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function AiReviewPanel({
  selectedReview,
  prInputs,
  reviewLoading,
  reviewErrors,
  getReviewKey,
  getVisibleReview,
  runAiReview,
  setPrInputs,
  sendToSeniorEngineer,
  seniorSummaryLoading,
  seniorSummaryErrors,
}: {
  selectedReview: {
    batch: DevelopmentBatch;
    task: DevelopmentTask;
    taskIndex: number;
  } | null;
  prInputs: Record<string, string>;
  reviewLoading: Record<string, boolean>;
  reviewErrors: Record<string, string>;
  getReviewKey: (
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    index: number,
  ) => string;
  getVisibleReview: (
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    index: number,
  ) => VisibleReview | null;
  runAiReview: (
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    index: number,
  ) => Promise<void>;
  setPrInputs: Dispatch<SetStateAction<Record<string, string>>>;
  sendToSeniorEngineer: (
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    index: number,
    visibleReview: VisibleReview,
  ) => Promise<void>;
  seniorSummaryLoading: Record<string, boolean>;
  seniorSummaryErrors: Record<string, string>;
}) {
  if (!selectedReview) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
        Select a task from Assigned Tasks, then click AI Review.
      </div>
    );
  }

  const { batch, task, taskIndex } = selectedReview;
  const reviewKey = getReviewKey(batch, task, taskIndex);
  const visibleReview = getVisibleReview(batch, task, taskIndex);
  const isReviewRunning = Boolean(reviewLoading[reviewKey]);
  const reviewError = reviewErrors[reviewKey];

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
            AI review
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            {task.title}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            Paste the PR for this specific task. If you switch to another task,
            this AI review page changes to that task.
          </p>
        </div>

        {visibleReview?.status ? (
          <span
            className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
              visibleReview.status,
            )}`}
          >
            {getStatusLabel(visibleReview.status)}
          </span>
        ) : null}
      </div>

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.02] p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
          Selected task
        </p>

        <h2 className="mt-4 text-2xl font-semibold text-white">{task.title}</h2>

        <p className="mt-2 text-sm text-[#ff9c73]">
          Assigned to: {formatOwnerRole(task.ownerRole)}
        </p>

        <p className="mt-4 text-sm leading-7 text-white/50">
          {getTaskSummary(task)}
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
          <p className="text-base font-semibold text-white">
            Link real GitHub pull request
          </p>

          <p className="mt-2 text-sm leading-7 text-white/45">
            Paste the PR created for this task. Loom fetches real changed files
            from GitHub using Octokit and sends the actual diff to the AI
            reviewer.
          </p>

          <input
            value={prInputs[reviewKey] || ""}
            onChange={(event) =>
              setPrInputs((prev) => ({
                ...prev,
                [reviewKey]: event.target.value,
              }))
            }
            placeholder="https://github.com/owner/repo/pull/12 or owner/repo#12"
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#aa4825]/70"
          />

          {reviewError ? (
            <p className="mt-3 text-sm text-red-200">{reviewError}</p>
          ) : null}

          <button
            type="button"
            onClick={() => runAiReview(batch, task, taskIndex)}
            disabled={isReviewRunning}
            className="mt-4 w-full rounded-xl bg-[#aa4825] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#bd5630] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isReviewRunning
              ? "Analyzing real GitHub PR..."
              : visibleReview?.status === "FIX_REQUIRED"
                ? "Run AI Review Again"
                : "Run AI Review"}
          </button>
        </div>

        {visibleReview ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-base font-semibold text-white">
                  AI Review Result
                </p>

                {visibleReview.pullRequestUrl ? (
                  <a
                    href={visibleReview.pullRequestUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-sm text-[#ff9c73] underline-offset-4 hover:underline"
                  >
                    #{visibleReview.pullNumber || ""}{" "}
                    {visibleReview.pullRequestTitle ||
                      "Open GitHub Pull Request"}
                  </a>
                ) : null}
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
                  visibleReview.status,
                )}`}
              >
                {getStatusLabel(visibleReview.status)}
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-white/55">
              {visibleReview.review.summary}
            </p>

            {visibleReview.status === "FIX_REQUIRED" ? (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
                <p className="text-sm font-semibold text-red-200">
                  Fix Required
                </p>

                <p className="mt-2 text-sm leading-7 text-red-100/70">
                  Fix these issues in GitHub, push the changes, then run AI
                  review again. The loop continues until Loom AI approves the
                  real PR diff.
                </p>

                <div className="mt-4 space-y-3">
                  {visibleReview.review.issues.length > 0 ? (
                    visibleReview.review.issues.map((issue, index) => (
                      <div
                        key={`${issue.file || "issue"}-${index}`}
                        className="rounded-xl border border-white/10 bg-black/25 p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-200/70">
                          {issue.severity}
                        </p>

                        {issue.file ? (
                          <p className="mt-2 text-xs text-white/40">
                            {issue.file}
                          </p>
                        ) : null}

                        <p className="mt-3 text-sm leading-7 text-white/75">
                          {issue.issue}
                        </p>

                        <p className="mt-3 text-sm leading-7 text-white/50">
                          Recommendation: {issue.recommendation}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-white/50">
                      AI marked this PR as fix required. Check the
                      implementation against the task and run the review again
                      after fixes.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <p className="text-sm font-semibold text-emerald-200">
                  Ready for Senior Technical Review
                </p>

                <p className="mt-2 text-sm leading-7 text-emerald-100/70">
                  Loom AI approved this real GitHub PR diff. The next step is
                  final approval by the Senior Technical Engineer / Human
                  Reviewer.
                </p>

                {visibleReview.status === "READY_FOR_HUMAN_REVIEW" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        sendToSeniorEngineer(
                          batch,
                          task,
                          taskIndex,
                          visibleReview,
                        )
                      }
                      disabled={Boolean(seniorSummaryLoading[reviewKey])}
                      className="mt-4 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {seniorSummaryLoading[reviewKey]
                        ? "Generating senior summary..."
                        : "Send to senior engineer"}
                    </button>

                    {seniorSummaryErrors[reviewKey] ? (
                      <p className="mt-3 text-sm text-red-200">
                        {seniorSummaryErrors[reviewKey]}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            )}

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                Changed files analyzed
              </p>

              <div className="mt-3 space-y-2">
                {visibleReview.changedFiles.length > 0 ? (
                  visibleReview.changedFiles.map((file) => (
                    <div
                      key={file.filename}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55 md:flex-row md:items-center md:justify-between"
                    >
                      <span>{file.filename}</span>

                      <span>
                        {file.status} · +{file.additions} -{file.deletions} ·{" "}
                        {file.changes} changes
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/40">
                    No changed file summary found.
                  </p>
                )}
              </div>
            </div>

            {visibleReview.githubCommentStatus === "FAILED" ? (
              <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <p className="text-sm leading-7 text-yellow-100">
                  AI review completed, but GitHub comment was not posted:{" "}
                  {visibleReview.githubCommentError}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function FixRequiredPanel({
  fixRequiredItems,
  openAiReview,
}: {
  fixRequiredItems: {
    batch: DevelopmentBatch;
    task: DevelopmentTask;
    taskIndex: number;
    visibleReview: VisibleReview | null;
    records: FixRequestRecord[];
  }[];
  openAiReview: (
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    index: number,
  ) => void;
}) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );

  function toggleExpanded(key: string) {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
          Fix required
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Fix required pull requests
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
          Every pull request that AI marks as needing improvement is saved here
          under its own task heading.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {fixRequiredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
            No fix-required pull requests right now.
          </div>
        ) : (
          fixRequiredItems.map(({ batch, task, taskIndex, records }) => {
            const itemKey = `${batch.id}:${getTaskId(task, taskIndex)}`;
            const isExpanded = Boolean(expandedItems[itemKey]);

            return (
              <section
                key={itemKey}
                className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200/70">
                      Task heading
                    </p>

                    <h2 className="mt-3 text-2xl font-semibold text-white">
                      {task.title}
                    </h2>

                    <p className="mt-2 text-sm text-[#ff9c73]">
                      Assigned to: {formatOwnerRole(task.ownerRole)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openAiReview(batch, task, taskIndex)}
                      className="rounded-xl border border-[#aa4825]/40 bg-[#aa4825]/10 px-4 py-2 text-xs font-semibold text-[#ff8a50] transition hover:bg-[#aa4825]/20"
                    >
                      Open AI Review
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpanded(itemKey)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white/70 transition hover:bg-white/[0.08]"
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-6">
                    <p className="max-w-3xl text-sm leading-7 text-red-100/60">
                      {getTaskSummary(task)}
                    </p>

                    <div className="mt-6 space-y-4">
                      {records.map((record) => (
                        <article
                          key={record.id}
                          className="rounded-2xl border border-white/10 bg-[#101010] p-5"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {record.pullRequestTitle || "Pull request"}
                              </p>

                              <p className="mt-2 text-xs text-white/40">
                                Saved on{" "}
                                {new Date(record.createdAt).toLocaleString()}
                              </p>
                            </div>

                            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                              Fix required
                            </span>
                          </div>

                          {record.pullRequestUrl ? (
                            <a
                              href={record.pullRequestUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 block break-all text-sm text-[#ff9c73] underline-offset-4 hover:underline"
                            >
                              {record.pullRequestUrl}
                            </a>
                          ) : null}

                          <p className="mt-4 text-sm leading-7 text-red-100/70">
                            {record.summary}
                          </p>

                          <div className="mt-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200/70">
                              Issues to improve
                            </p>

                            <div className="mt-3 space-y-3">
                              {record.issues.length > 0 ? (
                                record.issues.map((issue, index) => (
                                  <div
                                    key={`${record.id}-issue-${index}`}
                                    className="rounded-xl border border-red-500/20 bg-red-500/10 p-4"
                                  >
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
                                      {issue.severity}
                                    </p>

                                    {issue.file ? (
                                      <p className="mt-2 text-xs text-white/40">
                                        {issue.file}
                                      </p>
                                    ) : null}

                                    <p className="mt-3 text-sm leading-7 text-white/75">
                                      {issue.issue}
                                    </p>

                                    <p className="mt-3 text-sm leading-7 text-white/50">
                                      Recommendation: {issue.recommendation}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-white/40">
                                  No detailed issue list was returned by AI.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                              Changed files in this PR
                            </p>

                            <div className="mt-3 space-y-2">
                              {record.changedFiles.length > 0 ? (
                                record.changedFiles.map((file) => (
                                  <div
                                    key={`${record.id}-${file.filename}`}
                                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55 md:flex-row md:items-center md:justify-between"
                                  >
                                    <span>{file.filename}</span>

                                    <span>
                                      {file.status} · +{file.additions} -
                                      {file.deletions} · {file.changes} changes
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-white/40">
                                  No changed files recorded for this PR.
                                </p>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })
        )}
      </div>
    </>
  );
}

function SeniorSummaryPanel({
  seniorSummaries,
  selectedSummaryKey,
}: {
  seniorSummaries: Record<string, SeniorSummaryResponse>;
  selectedSummaryKey: string | null;
}) {
  const summary =
    selectedSummaryKey && seniorSummaries[selectedSummaryKey]
      ? seniorSummaries[selectedSummaryKey]
      : Object.values(seniorSummaries)[0];

  if (!summary) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
        No senior summary generated yet. Open an approved AI review and click
        Send to senior engineer.
      </div>
    );
  }

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
          Summary
        </p>

        {/* <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Senior engineer handoff
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
          This summary is saved and ready for the Senior Technical Engineer /
          Human Reviewer portal.
        </p> */}
      </div>

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.02] p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aea19d]">
          Senior review summary
        </p>

        <h2 className="mt-4 text-2xl font-semibold text-white">
          {summary.summary.title}
        </h2>

        <p className="mt-4 text-sm leading-7 text-white/60">
          {summary.summary.executiveSummary}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
            <p className="text-sm font-semibold text-white">Pull request</p>

            <p className="mt-3 text-sm text-white/50">
              {summary.summary.pullRequestSummary.pullRequestTitle ||
                "Untitled PR"}
            </p>

            {summary.summary.pullRequestSummary.pullRequestUrl ? (
              <a
                href={summary.summary.pullRequestSummary.pullRequestUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-all text-sm text-[#ff9c73] underline-offset-4 hover:underline"
              >
                {summary.summary.pullRequestSummary.pullRequestUrl}
              </a>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
            <p className="text-sm font-semibold text-white">AI decision</p>

            <p className="mt-3 text-sm text-emerald-200">
              {summary.summary.aiDecision}
            </p>

            <p className="mt-3 text-sm text-white/50">{summary.status}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
          <p className="text-sm font-semibold text-white">
            Implemented changes
          </p>

          <div className="mt-3 space-y-3">
            {summary.summary.implementedChanges &&
            summary.summary.implementedChanges.length > 0 ? (
              summary.summary.implementedChanges.map((change, index) => (
                <div
                  key={`${change.title}-${index}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-sm font-semibold text-white">
                    {change.title}
                  </p>

                  <p className="mt-2 text-sm leading-7 text-white/55">
                    {change.description}
                  </p>

                  {change.files.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {change.files.map((file) => (
                        <span
                          key={file}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45"
                        >
                          {file}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : summary.summary.finalChanges.length > 0 ? (
              summary.summary.finalChanges.map((file) => (
                <div
                  key={file.file}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-sm font-semibold text-white">
                    {file.file}
                  </p>

                  <p className="mt-2 text-sm text-white/55">
                    Implemented code change in this file: {file.status} · +
                    {file.additions} -{file.deletions} · {file.changes} changes
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40">
                No implemented change summary available.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
          <p className="text-sm font-semibold text-white">
            Pull requests reviewed
          </p>

          <div className="mt-3 space-y-3">
            {summary.summary.pullRequests &&
            summary.summary.pullRequests.length > 0 ? (
              summary.summary.pullRequests.map((pullRequest, index) => (
                <div
                  key={`${pullRequest.pullRequestUrl}-${index}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        #{pullRequest.pullNumber || index + 1}{" "}
                        {pullRequest.pullRequestTitle || "Pull request"}
                      </p>

                      <p className="mt-2 text-xs text-white/40">
                        {pullRequest.repository}
                      </p>
                    </div>

                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                      {pullRequest.aiDecision}
                    </span>
                  </div>

                  {pullRequest.pullRequestUrl ? (
                    <a
                      href={pullRequest.pullRequestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block break-all text-sm text-[#ff9c73] underline-offset-4 hover:underline"
                    >
                      {pullRequest.pullRequestUrl}
                    </a>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {pullRequest.changedFiles.length > 0 ? (
                      pullRequest.changedFiles.map((file) => (
                        <div
                          key={file.file}
                          className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50 md:flex-row md:items-center md:justify-between"
                        >
                          <span>{file.file}</span>

                          <span>
                            {file.status} · +{file.additions} -{file.deletions}{" "}
                            · {file.changes} changes
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-white/40">
                        No changed files recorded for this PR.
                      </p>
                    )}
                  </div>

                  {pullRequest.issues.length > 0 ? (
                    <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
                        Previous issues
                      </p>

                      <ul className="mt-2 space-y-2 text-sm text-red-100/65">
                        {pullRequest.issues.map((issue, issueIndex) => (
                          <li key={`${issue.issue}-${issueIndex}`}>
                            • {issue.issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">
                  {summary.summary.pullRequestSummary.pullRequestTitle ||
                    "Pull request"}
                </p>

                {summary.summary.pullRequestSummary.pullRequestUrl ? (
                  <a
                    href={summary.summary.pullRequestSummary.pullRequestUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block break-all text-sm text-[#ff9c73] underline-offset-4 hover:underline"
                  >
                    {summary.summary.pullRequestSummary.pullRequestUrl}
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
          <p className="text-sm font-semibold text-white">Final changes</p>

          <div className="mt-3 space-y-2">
            {summary.summary.finalChanges.length > 0 ? (
              summary.summary.finalChanges.map((file) => (
                <div
                  key={file.file}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55 md:flex-row md:items-center md:justify-between"
                >
                  <span>{file.file}</span>

                  <span>
                    {file.status} · +{file.additions} -{file.deletions} ·{" "}
                    {file.changes} changes
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40">
                No changed files included in summary.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
          <p className="text-sm font-semibold text-white">
            Failed review attempts
          </p>

          <div className="mt-3 space-y-3">
            {summary.summary.failedAttempts.length > 0 ? (
              summary.summary.failedAttempts.map((attempt, index) => (
                <div
                  key={`${attempt.pullRequestUrl}-${index}`}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-4"
                >
                  <p className="text-sm text-red-100/80">
                    {attempt.summary || "Previous AI review required fixes."}
                  </p>

                  {attempt.issues.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-red-100/60">
                      {attempt.issues.map((issue, issueIndex) => (
                        <li key={`${issue.issue}-${issueIndex}`}>
                          • {issue.issue}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40">
                No failed AI review attempts recorded.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
          <p className="text-sm font-semibold text-white">
            Senior reviewer checklist
          </p>

          <ul className="mt-3 space-y-2 text-sm leading-7 text-white/55">
            {summary.summary.seniorChecklist.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
  <button
    type="button"
    onClick={() => {
      window.location.href = `/review?summaryId=${summary.summaryId}`;
    }}
    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
  >
    Send to Senior Technical Engineer
  </button>
</div>
      </div>
    </>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#aa4825]/40 bg-[#aa4825]/10 px-3 py-1 text-xs text-[#ff8a50]">
      {label}
    </span>
  );
}

function DeveloperSidebarButton({
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
      className={
        active
          ? "w-full rounded-xl bg-white/10 px-5 py-4 text-left text-sm font-semibold text-white"
          : "w-full rounded-xl px-5 py-4 text-left text-sm font-semibold text-white/45 transition hover:bg-white/[0.04] hover:text-white/70"
      }
    >
      {label}
    </button>
  );
}
