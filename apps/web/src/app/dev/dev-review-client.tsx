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

//       setReviewResults((prev) => ({
//         ...prev,
//         [batch.id]: data,
//       }));
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

//       setReviewResults((prev) => ({
//         ...prev,
//         [batch.id]: data,
//       }));
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

type ActiveView = "assigned-tasks" | "ai-reviews" | "fix-required";

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

  useEffect(() => {
    const savedView = window.localStorage.getItem(
      `${storagePrefix}:active-view`,
    ) as ActiveView | null;

    const savedTarget = safeParseJson<ReviewTarget>(
      window.localStorage.getItem(`${storagePrefix}:selected-target`),
    );

    const savedInputs = safeParseJson<Record<string, string>>(
      window.localStorage.getItem(`${storagePrefix}:pr-inputs`),
    );

    const savedResults = safeParseJson<Record<string, ReviewResponse>>(
      window.localStorage.getItem(`${storagePrefix}:review-results`),
    );

    if (
      savedView === "assigned-tasks" ||
      savedView === "ai-reviews" ||
      savedView === "fix-required"
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
  }, [storagePrefix]);

  useEffect(() => {
    window.localStorage.setItem(`${storagePrefix}:active-view`, activeView);
  }, [activeView, storagePrefix]);

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
    return reviewedTaskItems.filter(
      (item) => item.visibleReview?.status === "FIX_REQUIRED",
    );
  }, [reviewedTaskItems]);

  const fixRequiredCount = fixRequiredItems.length;

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
          taskId: getTaskId(task, taskIndex),
          taskTitle: task.title,
          prInput,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to review pull request");
      }

      setReviewResults((prev) => ({
        ...prev,
        [reviewKey]: data,
      }));

      setSelectedReviewTarget({
        batchId: batch.id,
        taskId: getTaskId(task, taskIndex),
      });

      setActiveView("ai-reviews");
    } catch (error) {
      setReviewErrors((prev) => ({
        ...prev,
        [reviewKey]: error instanceof Error ? error.message : "AI review failed",
      }));
    } finally {
      setReviewLoading((prev) => ({
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

                <div className="flex flex-wrap gap-2">
                  <Badge label={`${fixRequiredCount} fix required`} />
                  <Badge label={`${readyForHumanReviewCount} ready`} />
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
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                         

                          <h2 className="mt-4 text-3xl font-semibold text-white">
                            {batch.title}
                          </h2>

                         
                        </div>

                        
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

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openAiReview(batch, task, taskIndex)
                                        }
                                        className="mt-5 w-full rounded-xl bg-[#aa4825] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#bd5630]"
                                      >
                                        AI Review
                                      </button>
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
            />
          ) : null}

          {activeView === "fix-required" ? (
            <FixRequiredPanel
              fixRequiredItems={fixRequiredItems}
              openAiReview={openAiReview}
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

        <h2 className="mt-4 text-2xl font-semibold text-white">
          {task.title}
        </h2>

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

                <button
                  type="button"
                  disabled
                  className="mt-4 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-100 opacity-80"
                >
                  Ready for senior engineer
                </button>
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
  }[];
  openAiReview: (
    batch: DevelopmentBatch,
    task: DevelopmentTask,
    index: number,
  ) => void;
}) {
  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
          Fix required
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Fix required tasks
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
          These tasks have AI review issues. Open a task review, fix the PR in
          GitHub, then run AI review again.
        </p>
      </div>

      <div className="mt-10 space-y-3">
        {fixRequiredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
            No fix-required tasks right now.
          </div>
        ) : (
          fixRequiredItems.map(({ batch, task, taskIndex, visibleReview }) => (
            <button
              key={`${batch.id}:${getTaskId(task, taskIndex)}`}
              type="button"
              onClick={() => openAiReview(batch, task, taskIndex)}
              className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-left transition hover:bg-red-500/15"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">
                    {task.title}
                  </p>

                  <p className="mt-2 text-sm text-[#ff9c73]">
                    {formatOwnerRole(task.ownerRole)}
                  </p>

                  <p className="mt-3 text-sm leading-7 text-red-100/60">
                    {visibleReview?.review.summary ||
                      "Open AI review result"}
                  </p>
                </div>

                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                  Fix required
                </span>
              </div>
            </button>
          ))
        )}
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