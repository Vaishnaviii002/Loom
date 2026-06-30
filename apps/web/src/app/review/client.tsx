// "use client";

// import { useMemo, useState } from "react";
// import { LoomLogo } from "@/components/brand/loom-logo";

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

// type MergeResult = {
//   ok: boolean;
//   status: "MERGED_TO_MAIN" | "ALREADY_MERGED_TO_MAIN";
//   summaryId: string;
//   auditLogId: string;
//   mergeSha?: string;
//   message?: string;
//   pullRequest: {
//     url: string;
//     number: number;
//     title: string;
//     baseBranch: string;
//     headBranch: string;
//   };
// };

// type SeniorReviewClientProps = {
//   mode: "SENIOR_ENGINEER" | "ADMIN_READ_ONLY_PREVIEW";
//   senior: {
//     name: string;
//     email: string;
//     role: string;
//   };
//   summaries: SeniorSummaryItem[];
//   selectedSummaryId: string;
// };

// export default function SeniorReviewClient({
//   mode,
//   senior,
//   summaries,
//   selectedSummaryId,
// }: SeniorReviewClientProps) {
//   const [activeView, setActiveView] = useState<
//     "summary" | "pull-requests" | "ai-history" | "final-approval"
//   >("summary");

//   const [selectedId, setSelectedId] = useState(
//     selectedSummaryId || summaries[0]?.id || "",
//   );

//   const selectedSummary = useMemo(() => {
//     return summaries.find((summary) => summary.id === selectedId) || summaries[0];
//   }, [summaries, selectedId]);

//   return (
//     <main className="h-screen overflow-hidden bg-[#111111] text-white">
//       <div className="grid h-screen lg:grid-cols-[20%_80%]">
//         <aside className="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0f0f0f]">
//           <div className="border-b border-white/10 px-5 py-5">
//             <LoomLogo size="small" />

//             <p className="mt-10 text-sm text-white/40">
//               {mode === "ADMIN_READ_ONLY_PREVIEW"
//                 ? "Admin Senior Preview"
//                 : "Senior Engineer Portal"}
//             </p>
//           </div>

//           <div className="flex-1 px-4 py-5">
//             <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
//               Assigned review
//             </p>

//             <div className="mb-8 rounded-2xl border border-[#aa4825]/50 bg-[#aa4825]/10 p-4">
//               <p className="text-sm font-semibold text-[#ff8a50]">
//                 {selectedSummary?.taskTitle || "No summary selected"}
//               </p>

//               <p className="mt-2 break-all text-xs text-white/40">
//                 {selectedSummary?.repository || "Repository not connected"}
//               </p>
//             </div>

//             <nav className="space-y-2">
//               <SeniorSidebarButton
//                 label="Summary"
//                 active={activeView === "summary"}
//                 onClick={() => setActiveView("summary")}
//               />

//               <SeniorSidebarButton
//                 label="Pull Requests"
//                 active={activeView === "pull-requests"}
//                 onClick={() => setActiveView("pull-requests")}
//               />

//               <SeniorSidebarButton
//                 label="AI Review History"
//                 active={activeView === "ai-history"}
//                 onClick={() => setActiveView("ai-history")}
//               />

//               <SeniorSidebarButton
//                 label="Final Approval"
//                 active={activeView === "final-approval"}
//                 onClick={() => setActiveView("final-approval")}
//               />
//             </nav>
//           </div>

//           <div className="border-t border-white/10 p-4">
//             <div className="rounded-2xl bg-white/5 p-3">
//               <p className="truncate text-sm font-medium text-white">
//                 {senior.name || "Senior Engineer"}
//               </p>

//               <p className="mt-1 truncate text-xs text-white/40">
//                 {senior.email}
//               </p>

//               <p className="mt-2 text-xs font-medium text-[#aa4825]">
//                 {mode === "ADMIN_READ_ONLY_PREVIEW"
//                   ? "ADMIN READ ONLY"
//                   : "SENIOR ENGINEER"}
//               </p>
//             </div>
//           </div>
//         </aside>

//         <section className="h-screen overflow-y-auto px-10 py-10">
//           <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
//             <div>
//               <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//                 Senior technical review
//               </p>

//               <h1 className="mt-4 text-4xl font-semibold tracking-tight">
//                 Review dashboard
//               </h1>

//               <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
//                 Developer-approved summaries appear here after AI review. Admin
//                 can preview this portal, but cannot change any review decision.
//               </p>
//             </div>

//             <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
//               Read only
//             </span>
//           </div>

//           {summaries.length === 0 ? (
//             <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
//               No senior review summaries have been sent yet.
//             </div>
//           ) : (
//             <div className="mt-10 grid gap-6 xl:grid-cols-[32%_68%]">
//               <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
//                 <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
//                   Summary queue
//                 </p>

//                 <div className="mt-5 space-y-3">
//                   {summaries.map((summary) => (
//                     <button
//                       key={summary.id}
//                       type="button"
//                       onClick={() => setSelectedId(summary.id)}
//                       className={
//                         selectedId === summary.id
//                           ? "w-full rounded-2xl border border-[#aa4825]/50 bg-[#aa4825]/10 p-4 text-left"
//                           : "w-full rounded-2xl border border-white/10 bg-[#101010] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
//                       }
//                     >
//                       <p className="text-sm font-semibold text-white">
//                         {summary.taskTitle}
//                       </p>

//                       <p className="mt-2 text-xs text-[#ff9c73]">
//                         {summary.repository || "Repository not connected"}
//                       </p>

//                       <p className="mt-2 text-xs text-white/35">
//                         {new Date(summary.createdAt).toLocaleString()}
//                       </p>
//                     </button>
//                   ))}
//                 </div>
//               </section>

//               <section>
//                 {activeView === "summary" && selectedSummary ? (
//                   <SummaryView summary={selectedSummary} />
//                 ) : null}

//                 {activeView === "pull-requests" && selectedSummary ? (
//                   <PullRequestsView summary={selectedSummary} />
//                 ) : null}

//                 {activeView === "ai-history" && selectedSummary ? (
//                   <AiHistoryView summary={selectedSummary} />
//                 ) : null}

//                 {activeView === "final-approval" ? (
//   <FinalApprovalReadOnly mode={mode} summary={selectedSummary} />
// ) : null}
//               </section>
//             </div>
//           )}
//         </section>
//       </div>
//     </main>
//   );
// }

// function SummaryView({ summary }: { summary: SeniorSummaryItem }) {
//   return (
//     <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7">
//       <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//         Developer handoff summary
//       </p>

//       <h2 className="mt-4 text-2xl font-semibold text-white">
//         {summary.summary.title}
//       </h2>

//       <p className="mt-4 text-sm leading-7 text-white/60">
//         {summary.summary.executiveSummary}
//       </p>

//       <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//         <p className="text-sm font-semibold text-white">Task summary</p>

//         <p className="mt-3 text-lg font-semibold text-white">
//           {summary.summary.taskSummary.title}
//         </p>

//         <p className="mt-2 text-sm text-[#ff9c73]">
//           Owner: {summary.summary.taskSummary.ownerRole}
//         </p>

//         <p className="mt-3 text-sm leading-7 text-white/55">
//           {summary.summary.taskSummary.summary}
//         </p>
//       </div>

//       <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//         <p className="text-sm font-semibold text-white">
//           Implemented changes
//         </p>

//         <div className="mt-3 space-y-3">
//           {summary.summary.implementedChanges &&
//           summary.summary.implementedChanges.length > 0 ? (
//             summary.summary.implementedChanges.map((change, index) => (
//               <div
//                 key={`${change.title}-${index}`}
//                 className="rounded-xl border border-white/10 bg-black/20 p-4"
//               >
//                 <p className="text-sm font-semibold text-white">
//                   {change.title}
//                 </p>

//                 <p className="mt-2 text-sm leading-7 text-white/55">
//                   {change.description}
//                 </p>

//                 {change.files.length > 0 ? (
//                   <div className="mt-3 flex flex-wrap gap-2">
//                     {change.files.map((file) => (
//                       <span
//                         key={file}
//                         className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45"
//                       >
//                         {file}
//                       </span>
//                     ))}
//                   </div>
//                 ) : null}
//               </div>
//             ))
//           ) : summary.summary.finalChanges.length > 0 ? (
//             summary.summary.finalChanges.map((file) => (
//               <div
//                 key={file.file}
//                 className="rounded-xl border border-white/10 bg-black/20 p-4"
//               >
//                 <p className="text-sm font-semibold text-white">{file.file}</p>

//                 <p className="mt-2 text-sm text-white/55">
//                   {file.status} · +{file.additions} -{file.deletions} ·{" "}
//                   {file.changes} changes
//                 </p>
//               </div>
//             ))
//           ) : (
//             <p className="text-sm text-white/40">
//               No implemented changes were included.
//             </p>
//           )}
//         </div>
//       </div>

//       <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//         <p className="text-sm font-semibold text-white">
//           Senior reviewer checklist
//         </p>

//         <ul className="mt-3 space-y-2 text-sm leading-7 text-white/55">
//           {summary.summary.seniorChecklist.map((item) => (
//             <li key={item}>• {item}</li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// }

// function PullRequestsView({ summary }: { summary: SeniorSummaryItem }) {
//   const pullRequests =
//     summary.summary.pullRequests && summary.summary.pullRequests.length > 0
//       ? summary.summary.pullRequests
//       : [
//           {
//             pullRequestUrl: summary.summary.pullRequestSummary.pullRequestUrl,
//             pullRequestTitle:
//               summary.summary.pullRequestSummary.pullRequestTitle,
//             pullNumber: summary.summary.pullRequestSummary.pullNumber,
//             repository: summary.summary.pullRequestSummary.repository,
//             status: summary.status,
//             aiDecision: summary.summary.aiDecision,
//             changedFiles: summary.summary.finalChanges,
//             issues: [],
//           },
//         ];

//   return (
//     <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7">
//       <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//         Pull requests
//       </p>

//       <h2 className="mt-4 text-2xl font-semibold text-white">
//         Pull requests reviewed
//       </h2>

//       <div className="mt-6 space-y-4">
//         {pullRequests.map((pullRequest, index) => (
//           <article
//             key={`${pullRequest.pullRequestUrl}-${index}`}
//             className="rounded-2xl border border-white/10 bg-[#101010] p-5"
//           >
//             <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
//               <div>
//                 <p className="text-sm font-semibold text-white">
//                   #{pullRequest.pullNumber || index + 1}{" "}
//                   {pullRequest.pullRequestTitle || "Pull request"}
//                 </p>

//                 <p className="mt-2 text-xs text-white/40">
//                   {pullRequest.repository}
//                 </p>
//               </div>

//               <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
//                 {pullRequest.aiDecision}
//               </span>
//             </div>

//             {pullRequest.pullRequestUrl ? (
//               <a
//                 href={pullRequest.pullRequestUrl}
//                 target="_blank"
//                 rel="noreferrer"
//                 className="mt-3 block break-all text-sm text-[#ff9c73] underline-offset-4 hover:underline"
//               >
//                 {pullRequest.pullRequestUrl}
//               </a>
//             ) : null}

//             <div className="mt-4 space-y-2">
//               {pullRequest.changedFiles.length > 0 ? (
//                 pullRequest.changedFiles.map((file) => (
//                   <div
//                     key={file.file}
//                     className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55 md:flex-row md:items-center md:justify-between"
//                   >
//                     <span>{file.file}</span>

//                     <span>
//                       {file.status} · +{file.additions} -{file.deletions} ·{" "}
//                       {file.changes} changes
//                     </span>
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-sm text-white/40">
//                   No changed files recorded.
//                 </p>
//               )}
//             </div>
//           </article>
//         ))}
//       </div>
//     </div>
//   );
// }

// function AiHistoryView({ summary }: { summary: SeniorSummaryItem }) {
//   return (
//     <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7">
//       <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//         AI review history
//       </p>

//       <h2 className="mt-4 text-2xl font-semibold text-white">
//         Failed attempts and final result
//       </h2>

//       <div className="mt-6 space-y-4">
//         {summary.summary.failedAttempts.length === 0 ? (
//           <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 text-sm text-white/45">
//             No failed AI review attempts were included.
//           </div>
//         ) : (
//           summary.summary.failedAttempts.map((attempt, index) => (
//             <article
//               key={`${attempt.pullRequestUrl}-${index}`}
//               className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5"
//             >
//               <p className="text-sm leading-7 text-red-100/75">
//                 {attempt.summary || "Previous AI review required fixes."}
//               </p>

//               {attempt.pullRequestUrl ? (
//                 <a
//                   href={attempt.pullRequestUrl}
//                   target="_blank"
//                   rel="noreferrer"
//                   className="mt-3 block break-all text-sm text-[#ff9c73] underline-offset-4 hover:underline"
//                 >
//                   {attempt.pullRequestUrl}
//                 </a>
//               ) : null}

//               {attempt.issues.length > 0 ? (
//                 <ul className="mt-4 space-y-2 text-sm text-red-100/60">
//                   {attempt.issues.map((issue, issueIndex) => (
//                     <li key={`${issue.issue}-${issueIndex}`}>
//                       • {issue.issue}
//                     </li>
//                   ))}
//                 </ul>
//               ) : null}
//             </article>
//           ))
//         )}

//         <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
//           <p className="text-sm font-semibold text-emerald-200">
//             Final AI decision
//           </p>

//           <p className="mt-2 text-sm leading-7 text-emerald-100/70">
//             {summary.summary.aiDecision}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// function FinalApprovalReadOnly({
//   mode,
//   summary,
// }: {
//   mode: "SENIOR_ENGINEER" | "ADMIN_READ_ONLY_PREVIEW";
//   summary?: SeniorSummaryItem;
// }) {
//   const [mergeLoading, setMergeLoading] = useState(false);
//   const [mergeError, setMergeError] = useState("");
//   const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);

//   async function approveAndMerge() {
//     if (!summary) return;

//     setMergeError("");
//     setMergeLoading(true);

//     try {
//       const response = await fetch("/api/review/approve-merge", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           summaryId: summary.id,
//           mergeMethod: "squash",
//         }),
//       });

//       const responseText = await response.text();

//       let data: MergeResult & {
//         error?: string;
//       };

//       try {
//         data = JSON.parse(responseText) as MergeResult & {
//           error?: string;
//         };
//       } catch {
//         throw new Error(
//           "Approve-and-merge API returned HTML instead of JSON. Check /api/review/approve-merge/route.ts.",
//         );
//       }

//       if (!response.ok || !data.ok) {
//         throw new Error(data.error || "Failed to merge pull request");
//       }

//       setMergeResult(data);
//     } catch (error) {
//       setMergeError(
//         error instanceof Error ? error.message : "Failed to merge pull request",
//       );
//     } finally {
//       setMergeLoading(false);
//     }
//   }

//   if (!summary) {
//     return (
//       <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
//         No summary selected for final approval.
//       </div>
//     );
//   }

//   const pullRequestUrl =
//     summary.pullRequestUrl ||
//     summary.summary.pullRequestSummary.pullRequestUrl;

//   return (
//     <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
//       <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//         Final approval
//       </p>

//       <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
//         <div>
//           <h2 className="text-2xl font-semibold text-white">
//             Approve pull request and merge to main
//           </h2>

//           <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
//             Senior Technical Engineer verifies the developer summary, real
//             GitHub pull request, changed files, and AI review history. After
//             approval, Loom merges the pull request into main and marks it as a
//             shipped feature.
//           </p>
//         </div>

//         <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
//           Human approval required
//         </span>
//       </div>

//       <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//         <p className="text-sm font-semibold text-white">Pull request</p>

//         <p className="mt-3 text-sm text-white/55">
//           {summary.pullRequestTitle ||
//             summary.summary.pullRequestSummary.pullRequestTitle ||
//             "Untitled PR"}
//         </p>

//         {pullRequestUrl ? (
//           <a
//             href={pullRequestUrl}
//             target="_blank"
//             rel="noreferrer"
//             className="mt-3 block break-all text-sm text-[#ff9c73] underline-offset-4 hover:underline"
//           >
//             {pullRequestUrl}
//           </a>
//         ) : (
//           <p className="mt-3 text-sm text-red-200">
//             No pull request URL found in this summary.
//           </p>
//         )}

//         <div className="mt-5 grid gap-3 md:grid-cols-3">
//           <div className="rounded-xl border border-white/10 bg-black/20 p-4">
//             <p className="text-xs text-white/35">Repository</p>

//             <p className="mt-2 break-all text-sm text-white/70">
//               {summary.repository || "Unknown"}
//             </p>
//           </div>

//           <div className="rounded-xl border border-white/10 bg-black/20 p-4">
//             <p className="text-xs text-white/35">AI decision</p>

//             <p className="mt-2 text-sm text-emerald-200">
//               {summary.summary.aiDecision}
//             </p>
//           </div>

//           <div className="rounded-xl border border-white/10 bg-black/20 p-4">
//             <p className="text-xs text-white/35">Target branch</p>

//             <p className="mt-2 text-sm text-white/70">main</p>
//           </div>
//         </div>
//       </div>

//       <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
//         <p className="text-sm font-semibold text-white">
//           Human approval checklist
//         </p>

//         <ul className="mt-3 space-y-2 text-sm leading-7 text-white/55">
//           <li>• I reviewed the developer handoff summary.</li>
//           <li>• I verified the real GitHub pull request.</li>
//           <li>• I checked the changed files and AI review history.</li>
//           <li>• I confirm there are no blocking AI issues left.</li>
//           <li>• I approve merging this PR into main as a shipped feature.</li>
//         </ul>
//       </div>

//       {mode === "ADMIN_READ_ONLY_PREVIEW" ? (
//         <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
//           <p className="text-sm font-semibold text-yellow-100">
//             Admin read-only mode
//           </p>

//           <p className="mt-2 text-sm leading-7 text-yellow-100/70">
//             Admin can inspect this page, but cannot approve, reject, or merge a
//             senior review decision.
//           </p>
//         </div>
//       ) : (
//         <button
//           type="button"
//           onClick={approveAndMerge}
//           disabled={mergeLoading || !pullRequestUrl || Boolean(mergeResult)}
//           className="mt-6 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
//         >
//           {mergeLoading
//             ? "Approving and merging into main..."
//             : mergeResult
//               ? "Merged into main"
//               : "Approve & Merge Pull Request"}
//         </button>
//       )}

//       {mergeError ? (
//         <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
//           <p className="text-sm leading-7 text-red-100">{mergeError}</p>
//         </div>
//       ) : null}

//       {mergeResult ? (
//         <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
//           <p className="text-sm font-semibold text-emerald-200">
//             Feature shipped
//           </p>

//           <p className="mt-2 text-sm leading-7 text-emerald-100/70">
//             Senior Technical Engineer approved this pull request and it is now
//             merged into the main branch.
//           </p>

//           <div className="mt-4 space-y-2 text-sm text-emerald-100/70">
//             <p>Status: {mergeResult.status}</p>
//             <p>PR: #{mergeResult.pullRequest.number}</p>
//             <p>Base branch: {mergeResult.pullRequest.baseBranch}</p>
//             <p>Head branch: {mergeResult.pullRequest.headBranch}</p>
//             {mergeResult.mergeSha ? (
//               <p>Merge SHA: {mergeResult.mergeSha}</p>
//             ) : null}
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }
// function SeniorSidebarButton({
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

import { useMemo, useState } from "react";
import { LoomLogo } from "@/components/brand/loom-logo";

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

type MergeResult = {
  ok: boolean;
  status: "MERGED_TO_MAIN" | "ALREADY_MERGED_TO_MAIN";
  summaryId: string;
  auditLogId: string;
  mergeSha?: string;
  message?: string;
  pullRequest: {
    url: string;
    number: number;
    title: string;
    baseBranch: string;
    headBranch: string;
  };
};

type RequestChangesResult = {
  ok: boolean;
  status: "CHANGES_REQUESTED" | "REJECTED";
  auditLogId: string;
  summaryId: string;
  reason: string;
  createdAt: string;
};

type SeniorReviewClientProps = {
  mode: "SENIOR_ENGINEER" | "ADMIN_READ_ONLY_PREVIEW";
  senior: {
    name: string;
    email: string;
    role: string;
  };
  summaries: SeniorSummaryItem[];
  selectedSummaryId: string;
  initialDecisionBySummaryId?: Record<string, SeniorDecision>;
};

export default function SeniorReviewClient({
  mode,
  senior,
  summaries,
  selectedSummaryId,
  initialDecisionBySummaryId = {},
}: SeniorReviewClientProps) {
  const [activeView, setActiveView] = useState<
    "summary" | "pull-requests" | "ai-history" | "final-approval"
  >("summary");

  const [selectedId, setSelectedId] = useState(
    selectedSummaryId || summaries[0]?.id || "",
  );

  const [decisionBySummaryId, setDecisionBySummaryId] = useState<
    Record<string, SeniorDecision>
  >(initialDecisionBySummaryId);

  const selectedSummary = useMemo(() => {
    return summaries.find((summary) => summary.id === selectedId) || summaries[0];
  }, [summaries, selectedId]);

  const selectedDecision = selectedSummary
    ? decisionBySummaryId[selectedSummary.id]
    : null;

  return (
    <main className="h-screen overflow-hidden bg-[#111111] text-white">
      <div className="grid h-screen lg:grid-cols-[20%_80%]">
        <aside className="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0f0f0f]">
          <div className="border-b border-white/10 px-5 py-5">
            <LoomLogo size="small" />

            <p className="mt-10 text-sm text-white/40">
              {mode === "ADMIN_READ_ONLY_PREVIEW"
                ? "Admin Senior Preview"
                : "Senior Engineer Portal"}
            </p>
          </div>

          <div className="flex-1 px-4 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
              Assigned review
            </p>

            <div className="mb-8 rounded-2xl border border-[#aa4825]/50 bg-[#aa4825]/10 p-4">
              <p className="text-sm font-semibold text-[#ff8a50]">
                {selectedSummary?.taskTitle || "No summary selected"}
              </p>

              <p className="mt-2 break-all text-xs text-white/40">
                {selectedSummary?.repository || "Repository not connected"}
              </p>

              {selectedDecision ? (
                <p className="mt-3 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">
                  {selectedDecision.status}
                </p>
              ) : null}
            </div>

            <nav className="space-y-2">
              <SeniorSidebarButton
                label="Summary"
                active={activeView === "summary"}
                onClick={() => setActiveView("summary")}
              />

              <SeniorSidebarButton
                label="Pull Requests"
                active={activeView === "pull-requests"}
                onClick={() => setActiveView("pull-requests")}
              />

              <SeniorSidebarButton
                label="AI Review History"
                active={activeView === "ai-history"}
                onClick={() => setActiveView("ai-history")}
              />

              <SeniorSidebarButton
                label="Final Approval"
                active={activeView === "final-approval"}
                onClick={() => setActiveView("final-approval")}
              />
            </nav>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="truncate text-sm font-medium text-white">
                {senior.name || "Senior Engineer"}
              </p>

              <p className="mt-1 truncate text-xs text-white/40">
                {senior.email}
              </p>

              <p className="mt-2 text-xs font-medium text-[#aa4825]">
                {mode === "ADMIN_READ_ONLY_PREVIEW"
                  ? "ADMIN READ ONLY"
                  : "SENIOR ENGINEER"}
              </p>
            </div>
          </div>
        </aside>

        <section className="h-screen overflow-y-auto px-10 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
                Senior technical review
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                Review dashboard
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
                Developer-approved summaries appear here after AI review. Admin
                can preview this portal, but cannot change any review decision.
              </p>
            </div>

            <span
              className={
                selectedDecision?.status === "MERGED_TO_MAIN" ||
                selectedDecision?.status === "ALREADY_MERGED_TO_MAIN" ||
                selectedDecision?.status === "FEATURE_SHIPPED"
                  ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
                  : selectedDecision?.status === "CHANGES_REQUESTED" ||
                      selectedDecision?.status === "REJECTED"
                    ? "rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200"
                    : "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
              }
            >
              {selectedDecision?.status || "Read only"}
            </span>
          </div>

          {summaries.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
              No senior review summaries have been sent yet.
            </div>
          ) : (
            <div className="mt-10 grid gap-6 xl:grid-cols-[32%_68%]">
              <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                  Summary queue
                </p>

                <div className="mt-5 space-y-3">
                  {summaries.map((summary) => {
                    const decision = decisionBySummaryId[summary.id];

                    return (
                      <button
                        key={summary.id}
                        type="button"
                        onClick={() => setSelectedId(summary.id)}
                        className={
                          selectedId === summary.id
                            ? "w-full rounded-2xl border border-[#aa4825]/50 bg-[#aa4825]/10 p-4 text-left"
                            : "w-full rounded-2xl border border-white/10 bg-[#101010] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-white">
                            {summary.taskTitle}
                          </p>

                          {decision ? (
                            <span
                              className={
                                decision.status === "MERGED_TO_MAIN" ||
                                decision.status === "ALREADY_MERGED_TO_MAIN" ||
                                decision.status === "FEATURE_SHIPPED"
                                  ? "shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200"
                                  : "shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-200"
                              }
                            >
                              {decision.status}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-xs text-[#ff9c73]">
                          {summary.repository || "Repository not connected"}
                        </p>

                        <p className="mt-2 text-xs text-white/35">
                          {new Date(summary.createdAt).toLocaleString()}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                {activeView === "summary" && selectedSummary ? (
                  <SummaryView summary={selectedSummary} />
                ) : null}

                {activeView === "pull-requests" && selectedSummary ? (
                  <PullRequestsView summary={selectedSummary} />
                ) : null}

                {activeView === "ai-history" && selectedSummary ? (
                  <AiHistoryView summary={selectedSummary} />
                ) : null}

                {activeView === "final-approval" ? (
                  <FinalApprovalReadOnly
                    mode={mode}
                    summary={selectedSummary}
                    decision={selectedDecision}
                    onDecisionSaved={(summaryId, decision) =>
                      setDecisionBySummaryId((prev) => ({
                        ...prev,
                        [summaryId]: decision,
                      }))
                    }
                  />
                ) : null}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryView({ summary }: { summary: SeniorSummaryItem }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
        Developer handoff summary
      </p>

      <h2 className="mt-4 text-2xl font-semibold text-white">
        {summary.summary.title}
      </h2>

      <p className="mt-4 text-sm leading-7 text-white/60">
        {summary.summary.executiveSummary}
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
        <p className="text-sm font-semibold text-white">Task summary</p>

        <p className="mt-3 text-lg font-semibold text-white">
          {summary.summary.taskSummary.title}
        </p>

        <p className="mt-2 text-sm text-[#ff9c73]">
          Owner: {summary.summary.taskSummary.ownerRole}
        </p>

        <p className="mt-3 text-sm leading-7 text-white/55">
          {summary.summary.taskSummary.summary}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
        <p className="text-sm font-semibold text-white">Implemented changes</p>

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
                <p className="text-sm font-semibold text-white">{file.file}</p>

                <p className="mt-2 text-sm text-white/55">
                  {file.status} · +{file.additions} -{file.deletions} ·{" "}
                  {file.changes} changes
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/40">
              No implemented changes were included.
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
    </div>
  );
}

function PullRequestsView({ summary }: { summary: SeniorSummaryItem }) {
  const pullRequests =
    summary.summary.pullRequests && summary.summary.pullRequests.length > 0
      ? summary.summary.pullRequests
      : [
          {
            pullRequestUrl: summary.summary.pullRequestSummary.pullRequestUrl,
            pullRequestTitle:
              summary.summary.pullRequestSummary.pullRequestTitle,
            pullNumber: summary.summary.pullRequestSummary.pullNumber,
            repository: summary.summary.pullRequestSummary.repository,
            status: summary.status,
            aiDecision: summary.summary.aiDecision,
            changedFiles: summary.summary.finalChanges,
            issues: [],
          },
        ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
        Pull requests
      </p>

      <h2 className="mt-4 text-2xl font-semibold text-white">
        Pull requests reviewed
      </h2>

      <div className="mt-6 space-y-4">
        {pullRequests.map((pullRequest, index) => (
          <article
            key={`${pullRequest.pullRequestUrl}-${index}`}
            className="rounded-2xl border border-white/10 bg-[#101010] p-5"
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
                  No changed files recorded.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AiHistoryView({ summary }: { summary: SeniorSummaryItem }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
        AI review history
      </p>

      <h2 className="mt-4 text-2xl font-semibold text-white">
        Failed attempts and final result
      </h2>

      <div className="mt-6 space-y-4">
        {summary.summary.failedAttempts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 text-sm text-white/45">
            No failed AI review attempts were included.
          </div>
        ) : (
          summary.summary.failedAttempts.map((attempt, index) => (
            <article
              key={`${attempt.pullRequestUrl}-${index}`}
              className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5"
            >
              <p className="text-sm leading-7 text-red-100/75">
                {attempt.summary || "Previous AI review required fixes."}
              </p>

              {attempt.pullRequestUrl ? (
                <a
                  href={attempt.pullRequestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block break-all text-sm text-[#ff9c73] underline-offset-4 hover:underline"
                >
                  {attempt.pullRequestUrl}
                </a>
              ) : null}

              {attempt.issues.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm text-red-100/60">
                  {attempt.issues.map((issue, issueIndex) => (
                    <li key={`${issue.issue}-${issueIndex}`}>
                      • {issue.issue}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))
        )}

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-sm font-semibold text-emerald-200">
            Final AI decision
          </p>

          <p className="mt-2 text-sm leading-7 text-emerald-100/70">
            {summary.summary.aiDecision}
          </p>
        </div>
      </div>
    </div>
  );
}

function FinalApprovalReadOnly({
  mode,
  summary,
  decision,
  onDecisionSaved,
}: {
  mode: "SENIOR_ENGINEER" | "ADMIN_READ_ONLY_PREVIEW";
  summary?: SeniorSummaryItem;
  decision?: SeniorDecision | null;
  onDecisionSaved: (summaryId: string, decision: SeniorDecision) => void;
}) {
  const [mergeLoading, setMergeLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [reason, setReason] = useState("");

  async function approveAndMerge() {
    if (!summary) return;

    setActionError("");
    setMergeLoading(true);

    try {
      const response = await fetch("/api/review/approve-merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summaryId: summary.id,
          mergeMethod: "squash",
        }),
      });

      const responseText = await response.text();

      let data: MergeResult & {
        error?: string;
      };

      try {
        data = JSON.parse(responseText) as MergeResult & {
          error?: string;
        };
      } catch {
        throw new Error(
          "Approve-and-merge API returned HTML instead of JSON. Check /api/review/approve-merge/route.ts.",
        );
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to merge pull request");
      }

      onDecisionSaved(summary.id, {
        summaryId: summary.id,
        auditLogId: data.auditLogId,
        action: "senior.pr.approved_and_merged",
        status: data.status,
        message: data.message || "Pull request merged into main.",
        createdAt: new Date().toISOString(),
        pullRequestUrl: data.pullRequest.url,
        pullRequestTitle: data.pullRequest.title,
        pullNumber: data.pullRequest.number,
        repository: summary.repository,
        mergeSha: data.mergeSha || "",
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to merge pull request",
      );
    } finally {
      setMergeLoading(false);
    }
  }

  async function submitSeniorDecision(decisionType: "REQUEST_CHANGES" | "REJECT") {
    if (!summary) return;

    setActionError("");
    setDecisionLoading(true);

    try {
      const response = await fetch("/api/review/request-changes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summaryId: summary.id,
          decision: decisionType,
          reason,
        }),
      });

      const responseText = await response.text();

      let data: RequestChangesResult & {
        error?: string;
      };

      try {
        data = JSON.parse(responseText) as RequestChangesResult & {
          error?: string;
        };
      } catch {
        throw new Error(
          "Senior decision API returned HTML instead of JSON. Check /api/review/request-changes/route.ts.",
        );
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit senior decision");
      }

      onDecisionSaved(summary.id, {
        summaryId: summary.id,
        auditLogId: data.auditLogId,
        action:
          data.status === "CHANGES_REQUESTED"
            ? "senior.pr.changes_requested"
            : "senior.pr.rejected",
        status: data.status,
        reason: data.reason,
        message:
          data.status === "CHANGES_REQUESTED"
            ? "Senior engineer requested changes."
            : "Senior engineer rejected this implementation.",
        createdAt: data.createdAt,
        pullRequestUrl: summary.pullRequestUrl,
        pullRequestTitle: summary.pullRequestTitle,
        pullNumber: summary.pullNumber,
        repository: summary.repository,
      });

      setReason("");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to submit senior decision",
      );
    } finally {
      setDecisionLoading(false);
    }
  }

  if (!summary) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
        No summary selected for final approval.
      </div>
    );
  }

  const pullRequestUrl =
    summary.pullRequestUrl ||
    summary.summary.pullRequestSummary.pullRequestUrl;

  const isFinal =
    decision?.status === "MERGED_TO_MAIN" ||
    decision?.status === "ALREADY_MERGED_TO_MAIN" ||
    decision?.status === "FEATURE_SHIPPED" ||
    decision?.status === "CHANGES_REQUESTED" ||
    decision?.status === "REJECTED";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
        Final approval
      </p>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Approve pull request and merge to main
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            Senior Technical Engineer verifies the developer summary, real
            GitHub pull request, changed files, and AI review history. After
            approval, Loom merges the pull request into main and marks it as a
            shipped feature.
          </p>
        </div>

        <span
          className={
            decision?.status === "CHANGES_REQUESTED" ||
            decision?.status === "REJECTED"
              ? "rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200"
              : "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
          }
        >
          {decision?.status || "Human approval required"}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
        <p className="text-sm font-semibold text-white">Pull request</p>

        <p className="mt-3 text-sm text-white/55">
          {summary.pullRequestTitle ||
            summary.summary.pullRequestSummary.pullRequestTitle ||
            "Untitled PR"}
        </p>

        {pullRequestUrl ? (
          <a
            href={pullRequestUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block break-all text-sm text-[#ff9c73] underline-offset-4 hover:underline"
          >
            {pullRequestUrl}
          </a>
        ) : (
          <p className="mt-3 text-sm text-red-200">
            No pull request URL found in this summary.
          </p>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/35">Repository</p>

            <p className="mt-2 break-all text-sm text-white/70">
              {summary.repository || "Unknown"}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/35">AI decision</p>

            <p className="mt-2 text-sm text-emerald-200">
              {summary.summary.aiDecision}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/35">Target branch</p>

            <p className="mt-2 text-sm text-white/70">main</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
        <p className="text-sm font-semibold text-white">
          Human approval checklist
        </p>

        <ul className="mt-3 space-y-2 text-sm leading-7 text-white/55">
          <li>• I reviewed the developer handoff summary.</li>
          <li>• I verified the real GitHub pull request.</li>
          <li>• I checked the changed files and AI review history.</li>
          <li>• I confirm there are no blocking AI issues left.</li>
          <li>• I approve merging this PR into main as a shipped feature.</li>
        </ul>
      </div>

      {decision ? (
        <div
          className={
            decision.status === "MERGED_TO_MAIN" ||
            decision.status === "ALREADY_MERGED_TO_MAIN" ||
            decision.status === "FEATURE_SHIPPED"
              ? "mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5"
              : "mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5"
          }
        >
          <p className="text-sm font-semibold text-white">
            {decision.status === "MERGED_TO_MAIN" ||
            decision.status === "ALREADY_MERGED_TO_MAIN" ||
            decision.status === "FEATURE_SHIPPED"
              ? "Feature shipped"
              : decision.status === "CHANGES_REQUESTED"
                ? "Changes requested"
                : "Implementation rejected"}
          </p>

          <p className="mt-2 text-sm leading-7 text-white/65">
            {decision.message || decision.reason}
          </p>

          {decision.mergeSha ? (
            <p className="mt-3 text-xs text-white/45">
              Merge SHA: {decision.mergeSha}
            </p>
          ) : null}
        </div>
      ) : null}

      {mode === "ADMIN_READ_ONLY_PREVIEW" ? (
        <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <p className="text-sm font-semibold text-yellow-100">
            Admin read-only mode
          </p>

          <p className="mt-2 text-sm leading-7 text-yellow-100/70">
            Admin can inspect this page, but cannot approve, reject, request
            changes, or merge a senior review decision.
          </p>
        </div>
      ) : !isFinal ? (
        <>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Required for request changes or reject."
            className="mt-6 min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#aa4825]/70"
          />

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => submitSeniorDecision("REQUEST_CHANGES")}
              disabled={decisionLoading || !reason.trim()}
              className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {decisionLoading ? "Saving..." : "Request Changes"}
            </button>

            <button
              type="button"
              onClick={() => submitSeniorDecision("REJECT")}
              disabled={decisionLoading || !reason.trim()}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {decisionLoading ? "Saving..." : "Reject"}
            </button>

            <button
              type="button"
              onClick={approveAndMerge}
              disabled={mergeLoading || !pullRequestUrl}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mergeLoading ? "Merging..." : "Approve & Merge Pull Request"}
            </button>
          </div>
        </>
      ) : null}

      {actionError ? (
        <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm leading-7 text-red-100">{actionError}</p>
        </div>
      ) : null}
    </div>
  );
}

function SeniorSidebarButton({
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