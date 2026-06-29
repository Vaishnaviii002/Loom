// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { LoomLogo } from "@/components/brand/loom-logo";

// type ProjectSummary = {
//   id: string;
//   name: string;
//   repoFullName: string;
//   defaultBranch: string;
// };

// type PmUser = {
//   name: string;
//   email: string;
// };

// type DevelopmentTask = {
//   id: string;
//   title: string;
//   ownerRole: string;
//   summary: string;
//   workItems: string[];
//   affectedFiles: string[];
//   status: string;
// };

// type PmPrd = {
//   prdId: string;
//   requestId: string;
//   projectId: string;
//   title: string;
//   originalContent: string;
//   updatedContent: string;
//   finalContent: string;
//   pmNotes: string;
//   status: string;
//   sentAt: string;
// };

// type Responsibility = {
//   role: string;
//   heading: string;
//   details: string[];
// };

// type ActivePanel = "prds" | "update" | "final" | "responsibility";

// export default function PmDashboardClient({
//   mode,
//   user,
//   project,
//   prds,
// }: {
//   mode: "PM" | "ADMIN_PREVIEW";
//   user: PmUser;
//   project: ProjectSummary;
//   prds: PmPrd[];
// }) {
//   const [items, setItems] = useState<PmPrd[]>(prds);
//   const [selectedPrdId, setSelectedPrdId] = useState(prds[0]?.prdId ?? "");
//   const [activePanel, setActivePanel] = useState<ActivePanel>("prds");
//   const [editedContent, setEditedContent] = useState(
//     prds[0]?.updatedContent ?? "",
//   );
//   const [pmNotes, setPmNotes] = useState(prds[0]?.pmNotes ?? "");
//   const [isSaving, setIsSaving] = useState(false);
//   const [isFinalizing, setIsFinalizing] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");
//   const [isSendingToDevelopment, setIsSendingToDevelopment] = useState(false);
//   const [developmentError, setDevelopmentError] = useState("");
//   const [developmentSuccess, setDevelopmentSuccess] = useState("");
//   const [generatedTasks, setGeneratedTasks] = useState<DevelopmentTask[]>([]);
//   const [isAnalyzingTasks, setIsAnalyzingTasks] = useState(false);
//   const [taskAnalysisError, setTaskAnalysisError] = useState("");

//   const selectedPrd = useMemo(
//     () => items.find((prd) => prd.prdId === selectedPrdId) ?? null,
//     [items, selectedPrdId],
//   );

//   useEffect(() => {
//     if (!selectedPrd) {
//       return;
//     }

//     const nextContent =
//       selectedPrd.updatedContent || selectedPrd.originalContent;

//     setEditedContent(
//       shouldFormatAsHeadingDashDetails(nextContent)
//         ? formatPrdAsHeadingDashDetails(nextContent)
//         : nextContent,
//     );
//     setPmNotes(selectedPrd.pmNotes || "");
//     setError("");
//     setSuccess("");
//   }, [selectedPrd]);

//   const responsibility = useMemo(() => {
//     if (!selectedPrd) {
//       return [];
//     }

//     return getDeveloperResponsibility(
//       `${selectedPrd.title}\n\n${
//         selectedPrd.finalContent || editedContent || selectedPrd.originalContent
//       }`,
//     );
//   }, [selectedPrd, editedContent]);

//   function openPrd(prdId: string) {
//     setSelectedPrdId(prdId);
//     setActivePanel("update");
//   }

//   async function savePmChanges(mode: "SAVE_CHANGES" | "FINALIZE_PRD") {
//     if (!selectedPrd) {
//       return;
//     }

//     setError("");
//     setSuccess("");

//     if (!editedContent.trim()) {
//       setError("PRD content is required.");
//       return;
//     }

//     if (mode === "SAVE_CHANGES") {
//       setIsSaving(true);
//     } else {
//       setIsFinalizing(true);
//     }

//     try {
//       const response = await fetch("/api/pm/prds/save", {
//         method: "POST",
//         credentials: "include",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           projectId: project.id,
//           prdId: selectedPrd.prdId,
//           requestId: selectedPrd.requestId,
//           title: selectedPrd.title,
//           updatedContent: editedContent,
//           pmNotes,
//           mode,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         setError(data?.error || "Unable to save PRD.");
//         return;
//       }

//       const updatedPrd = data.prd as PmPrd;

//       setItems((current) =>
//         current.map((prd) =>
//           prd.prdId === updatedPrd.prdId ? updatedPrd : prd,
//         ),
//       );

//       setSuccess(
//         mode === "SAVE_CHANGES"
//           ? "PM changes saved permanently."
//           : "PRD finalized permanently.",
//       );

//       if (mode === "FINALIZE_PRD") {
//         setActivePanel("final");
//       }
//     } catch {
//       setError("Unable to save PRD.");
//     } finally {
//       setIsSaving(false);
//       setIsFinalizing(false);
//     }
//   }

//   async function analyzePrdTasks() {
//     if (!selectedPrd) {
//       return;
//     }

//     const finalContent = selectedPrd.finalContent || editedContent;

//     setTaskAnalysisError("");
//     setDevelopmentSuccess("");
//     setDevelopmentError("");

//     if (!finalContent.trim()) {
//       setTaskAnalysisError(
//         "Finalize the PRD before analyzing development tasks.",
//       );
//       return;
//     }

//     setIsAnalyzingTasks(true);

//     try {
//       const response = await fetch("/api/pm/prds/analyze-tasks", {
//         method: "POST",
//         credentials: "include",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           projectId: project.id,
//           prdId: selectedPrd.prdId,
//           requestId: selectedPrd.requestId,
//           title: selectedPrd.title,
//           finalContent,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         setTaskAnalysisError(data?.error || "Unable to analyze PRD.");
//         return;
//       }

//       setGeneratedTasks(Array.isArray(data.tasks) ? data.tasks : []);
//       setDevelopmentSuccess("AI created development tasks from this PRD.");
//     } catch {
//       setTaskAnalysisError("Unable to analyze PRD.");
//     } finally {
//       setIsAnalyzingTasks(false);
//     }
//   }

//   async function sendToDevelopment() {
//     if (!selectedPrd) {
//       return;
//     }

//     const finalContent = selectedPrd.finalContent || editedContent;

//     setDevelopmentError("");
//     setDevelopmentSuccess("");

//     if (!finalContent.trim()) {
//       setDevelopmentError("Finalize the PRD before sending it to development.");
//       return;
//     }

//     if (generatedTasks.length === 0) {
//       setDevelopmentError(
//         "Analyze the PRD and create development tasks first.",
//       );
//       return;
//     }

//     setIsSendingToDevelopment(true);

//     try {
//       const response = await fetch("/api/pm/prds/send-to-development", {
//         method: "POST",
//         credentials: "include",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           projectId: project.id,
//           prdId: selectedPrd.prdId,
//           requestId: selectedPrd.requestId,
//           title: selectedPrd.title,
//           finalContent,
//           tasks: generatedTasks,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         setDevelopmentError(data?.error || "Unable to send PRD to developers.");
//         return;
//       }

//       setItems((current) =>
//         current.map((prd) =>
//           prd.prdId === selectedPrd.prdId
//             ? {
//                 ...prd,
//                 status: "SENT_TO_DEVELOPMENT",
//               }
//             : prd,
//         ),
//       );

//       setDevelopmentSuccess("PRD converted into development tasks.");
//     } catch {
//       setDevelopmentError("Unable to send PRD to developers.");
//     } finally {
//       setIsSendingToDevelopment(false);
//     }
//   }

//   return (
//     <main className="min-h-screen bg-[#111111] text-white">
//       <div className="grid min-h-screen lg:grid-cols-[20%_80%]">
//         <aside className="sticky top-0 flex h-screen flex-col overflow-hidden border-r border-white/10 bg-[#0f0f0f] px-6 py-6">
//           <div>
//             <LoomLogo size="small" />

//             <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">
//               PM Portal
//             </h2>

//             <div className="mt-4 rounded-2xl border border-[#aa4825]/40 bg-[#aa4825]/10 p-3">
//               <p className="text-base font-semibold text-[#ff8a50]">
//                 {project.name}
//               </p>

//               <p className="mt-1 text-sm leading-6 text-white/45">
//                 {project.repoFullName}
//               </p>

//               <p className="mt-1 text-sm text-white/35">
//                 {mode === "ADMIN_PREVIEW" ? "Admin preview" : "Product Manager"}
//               </p>
//             </div>
//           </div>

//           <nav className="mt-10 flex-1 overflow-hidden">
//             <button
//               type="button"
//               onClick={() => setActivePanel("prds")}
//               className={`w-full rounded-xl px-5 py-1 text-left text-lg font-semibold transition ${
//                 activePanel === "prds"
//                   ? "bg-white/10 text-white"
//                   : "text-white/55 hover:bg-white/5 hover:text-white"
//               }`}
//             >
//               PRD
//             </button>

//             {selectedPrd && (
//               <div className="ml-4 mt-5 space-y-1 border-l border-white/10 pl-4 ">
//                 <p className="mb-3 line-clamp-2 text-sm leading-6 text-white/45">
//                   {selectedPrd.title}
//                 </p>

//                 <PanelButton
//                   label="Update changes"
//                   active={activePanel === "update"}
//                   onClick={() => setActivePanel("update")}
//                 />

//                 <PanelButton
//                   label="Final PRD"
//                   active={activePanel === "final"}
//                   onClick={() => setActivePanel("final")}
//                 />

//                 <PanelButton
//                   label="Developer responsibility"
//                   active={activePanel === "responsibility"}
//                   onClick={() => setActivePanel("responsibility")}
//                 />
//               </div>
//             )}
//           </nav>

//           <div className="border-t border-white/10 pt-5">
//             <div className="rounded-2xl bg-white/[0.04] p-4">
//               <p className="truncate text-sm font-semibold text-white">
//                 {user.name || "Product Manager"}
//               </p>

//               <p className="mt-1 truncate text-xs text-white/40">
//                 {user.email}
//               </p>

//               <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#aa4825]">
//                 {mode === "ADMIN_PREVIEW" ? "Admin preview" : "PM"}
//               </p>
//             </div>
//           </div>
//         </aside>

//         <section className="min-h-screen overflow-y-auto px-10 py-10">
//           {activePanel === "prds" && (
//             <PrdList
//               project={project}
//               items={items}
//               selectedPrdId={selectedPrdId}
//               onOpen={openPrd}
//             />
//           )}

//           {activePanel === "update" && selectedPrd && (
//             <UpdateChangesPanel
//               selectedPrd={selectedPrd}
//               editedContent={editedContent}
//               error={error}
//               success={success}
//               isSaving={isSaving}
//               isFinalizing={isFinalizing}
//               onContentChange={setEditedContent}
//               onSave={() => savePmChanges("SAVE_CHANGES")}
//               onFinalize={() => savePmChanges("FINALIZE_PRD")}
//             />
//           )}

//           {activePanel === "final" && selectedPrd && (
//             <FinalPrdPanel
//               selectedPrd={selectedPrd}
//               generatedTasks={generatedTasks}
//               isAnalyzingTasks={isAnalyzingTasks}
//               isSendingToDevelopment={isSendingToDevelopment}
//               taskAnalysisError={taskAnalysisError}
//               developmentError={developmentError}
//               developmentSuccess={developmentSuccess}
//               onBackToUpdate={() => setActivePanel("update")}
//               onAnalyzePrdTasks={analyzePrdTasks}
//               onSendToDevelopment={sendToDevelopment}
//             />
//           )}

//           {activePanel === "responsibility" && selectedPrd && (
//             <ResponsibilityPanel
//               selectedPrd={selectedPrd}
//               responsibility={responsibility}
//             />
//           )}
//         </section>
//       </div>
//     </main>
//   );
// }

// function PrdList({
//   project,
//   items,
//   selectedPrdId,
//   onOpen,
// }: {
//   project: ProjectSummary;
//   items: PmPrd[];
//   selectedPrdId: string;
//   onOpen: (prdId: string) => void;
// }) {
//   return (
//     <section>
//       <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//         Product Manager Review
//       </p>

//       <h1 className="mt-15 text-4xl font-semibold tracking-tight">
//         PRD workspace
//       </h1>

//       <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
//         Review client-generated PRDs, update missing details, finalize the PRD,
//         and decide who should execute the required work.
//       </p>

//       <div className="mt-8 space-y-4">
//         {items.length === 0 ? (
//           <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
//             No PRDs have been sent to this PM yet.
//           </div>
//         ) : (
//           items.map((prd) => {
//             const active = prd.prdId === selectedPrdId;

//             return (
//               <article
//                 key={prd.prdId}
//                 className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-[#aa4825]/30"
//               >
//                 <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
//                   <div>
//                     <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
//                       PRD finalise by Client
//                     </p>

//                     <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">
//                       {prd.title}
//                     </h3>

//                     <p className="mt-3 text-sm text-white/45">
//                       Status : {getStatusLabel(prd.status)}
//                     </p>

//                     <p className="mt-5 max-w-4xl text-sm leading-7 text-white/45">
//                       {getPrdPreview(prd.updatedContent || prd.originalContent)}
//                     </p>
//                   </div>

//                   <button
//                     type="button"
//                     onClick={() => onOpen(prd.prdId)}
//                     className="h-12 rounded-xl bg-[#8e3c1e] px-6 text-sm font-semibold text-white transition hover:bg-[#b84e2b]"
//                   >
//                     Open
//                   </button>
//                 </div>
//               </article>
//             );
//           })
//         )}
//       </div>
//     </section>
//   );
// }

// function UpdateChangesPanel({
//   selectedPrd,
//   editedContent,
//   error,
//   success,
//   isSaving,
//   isFinalizing,
//   onContentChange,
//   onSave,
//   onFinalize,
// }: {
//   selectedPrd: PmPrd;
//   editedContent: string;
//   error: string;
//   success: string;
//   isSaving: boolean;
//   isFinalizing: boolean;
//   onContentChange: (value: string) => void;
//   onSave: () => void;
//   onFinalize: () => void;
// }) {
//   return (
//     <section>
//       <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//         Update changes
//       </p>

//       <h1 className="mt-10 text-4xl font-semibold tracking-tight">
//         {selectedPrd.title}
//       </h1>

//       <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
//         Review the client-generated PRD, edit only what is required, then save
//         or finalize the PM-approved requirement.
//       </p>

//       <section className="mt-10 max-w-4xl rounded-2xl border border-white/10 bg-white/[0.015] p-5">
//         <h2 className="text-xl font-semibold text-white">
//           Client-generated PRD
//         </h2>

//         <div className="mt-5 space-y-5">
//           {splitTextIntoSections(selectedPrd.originalContent).map((section) => (
//             <section
//               key={section.heading}
//               className="grid gap-3 md:grid-cols-[190px_1fr]"
//             >
//               <h3 className="text-sm font-semibold leading-6 text-white/75">
//                 {section.heading}
//               </h3>

//               <p className="whitespace-pre-wrap text-sm leading-6 text-white/50">
//                 {section.body}
//               </p>
//             </section>
//           ))}
//         </div>
//       </section>

//       <section className="mt-20">
//         <h2 className="text-2xl font-semibold text-white">PM editable PRD</h2>

//         <p className="mt-2 text-sm leading-7 text-white/40">
//           Add missing details, refine acceptance criteria, and remove ambiguity.
//           These changes will be saved permanently.
//         </p>

//         <textarea
//           value={editedContent}
//           onChange={(event) => onContentChange(event.target.value)}
//           rows={10}
//           placeholder="Problem statement - Write the problem here..."
//           className="mt-6 max-h-[360px] w-full resize-none overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.015] px-6 py-5 text-sm leading-7 text-white outline-none transition placeholder:text-white/25 focus:border-white/25"
//         />

//         {error && (
//           <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
//             {error}
//           </div>
//         )}

//         {success && (
//           <div className="mt-5 rounded-xl border border-[#aa4825]/30 bg-[#aa4825]/10 p-4 text-sm text-[#ffb08a]">
//             {success}
//           </div>
//         )}

//         <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
//           <button
//             type="button"
//             onClick={onSave}
//             disabled={isSaving || isFinalizing}
//             className="h-11 rounded-xl border border-white/10 px-8 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
//           >
//             {isSaving ? "Saving..." : "Save changes"}
//           </button>

//           <button
//             type="button"
//             onClick={onFinalize}
//             disabled={isSaving || isFinalizing}
//             className="h-11 rounded-xl bg-[#87371a] px-8 text-sm font-semibold text-white transition hover:bg-[#ae4522] disabled:cursor-not-allowed disabled:opacity-60"
//           >
//             {isFinalizing ? "Finalizing..." : "Finalize PRD"}
//           </button>
//         </div>
//       </section>
//     </section>
//   );
// }

// function FinalPrdPanel({
//   selectedPrd,
//   generatedTasks,
//   isAnalyzingTasks,
//   isSendingToDevelopment,
//   taskAnalysisError,
//   developmentError,
//   developmentSuccess,
//   onBackToUpdate,
//   onAnalyzePrdTasks,
//   onSendToDevelopment,
// }: {
//   selectedPrd: PmPrd;
//   generatedTasks: DevelopmentTask[];
//   isAnalyzingTasks: boolean;
//   isSendingToDevelopment: boolean;
//   taskAnalysisError: string;
//   developmentError: string;
//   developmentSuccess: string;
//   onBackToUpdate: () => void;
//   onAnalyzePrdTasks: () => void;
//   onSendToDevelopment: () => void;
// }) {
//   const finalContent = selectedPrd.finalContent || "";
//   const finalSections = splitFinalPrdForDisplay(finalContent);
//   const isSentToDevelopment = selectedPrd.status === "SENT_TO_DEVELOPMENT";

//   return (
//     <section>
//       <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//         Final PRD
//       </p>

//       <h1 className="mt-4 text-4xl font-semibold tracking-tight">
//         {selectedPrd.title}
//       </h1>

//       <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
//         This is the Product Manager approved PRD. After approval, it can be
//         converted into development tasks for the assigned project.
//       </p>

//       {!finalContent ? (
//         <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8">
//           <h2 className="text-2xl font-semibold text-white">
//             Final PRD not created yet
//           </h2>

//           <p className="mt-3 text-sm leading-7 text-white/45">
//             Go to Update changes, refine the PRD, then click Finalize PRD.
//           </p>

//           <button
//             type="button"
//             onClick={onBackToUpdate}
//             className="mt-6 h-11 rounded-xl bg-[#aa4825] px-6 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
//           >
//             Go to Update changes
//           </button>
//         </div>
//       ) : (
//         <>
//           <div className="mt-10 max-h-[520px] overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.02] p-7">
//             <div className="space-y-5">
//               {finalSections.map((section) => (
//                 <section
//                   key={`${section.heading}-${section.body.slice(0, 20)}`}
//                   className="grid gap-3 md:grid-cols-[210px_1fr]"
//                 >
//                   <h2 className="text-sm font-semibold leading-7 text-white">
//                     {section.heading}
//                   </h2>

//                   <p className="whitespace-pre-wrap text-sm leading-7 text-white/55">
//                     {section.body}
//                   </p>
//                 </section>
//               ))}
//             </div>
//           </div>

//           {developmentError && (
//             <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
//               {developmentError}
//             </div>
//           )}

//           {developmentSuccess && (
//             <div className="mt-5 rounded-xl border border-[#aa4825]/30 bg-[#aa4825]/10 p-4 text-sm text-[#ffb08a]">
//               {developmentSuccess}
//             </div>
//           )}

//           {taskAnalysisError && (
//             <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
//               {taskAnalysisError}
//             </div>
//           )}

//           {generatedTasks.length > 0 && (
//             <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
//               <h2 className="text-2xl font-semibold text-white">
//                 AI-generated development tasks
//               </h2>

//               <p className="mt-2 text-sm leading-7 text-white/45">
//                 These tasks were created from this finalized PRD. Review them
//                 before sending to developers.
//               </p>

//               <div className="mt-6 space-y-5">
//                 {generatedTasks.map((task) => (
//                   <article
//                     key={task.id}
//                     className="rounded-2xl border border-white/10 bg-[#101010] p-5"
//                   >
//                     <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
//                       <div>
//                         <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
//                           Task for
//                         </p>

//                         <h3 className="mt-2 text-2xl font-semibold text-white">
//                           {formatOwnerRole(task.ownerRole)}
//                         </h3>
//                       </div>

//                       <Badge label={task.status} />
//                     </div>

//                     <h4 className="mt-6 text-lg font-semibold text-white">
//                       {task.title}
//                     </h4>

//                     <p className="mt-3 text-sm leading-7 text-white/45">
//                       {task.summary}
//                     </p>

//                     <ul className="mt-5 space-y-3 text-sm leading-7 text-white/55">
//                       {task.workItems.map((item) => (
//                         <li key={item}>• {item}</li>
//                       ))}
//                     </ul>

//                     {task.affectedFiles.length > 0 && (
//                       <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
//                         <p className="text-sm font-semibold text-white/70">
//                           Likely files
//                         </p>

//                         <ul className="mt-3 space-y-2 text-sm text-white/45">
//                           {task.affectedFiles.map((file) => (
//                             <li key={file}>• {file}</li>
//                           ))}
//                         </ul>
//                       </div>
//                     )}
//                   </article>
//                 ))}
//               </div>
//             </section>
//           )}

//           <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
//             <button
//               type="button"
//               onClick={onAnalyzePrdTasks}
//               disabled={isAnalyzingTasks || isSentToDevelopment}
//               className="h-11 rounded-xl border border-white/10 px-7 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
//             >
//               {isAnalyzingTasks ? "Analyzing PRD..." : "Analyze PRD with AI"}
//             </button>

//             <button
//               type="button"
//               onClick={onSendToDevelopment}
//               disabled={
//                 isSendingToDevelopment ||
//                 isSentToDevelopment ||
//                 generatedTasks.length === 0
//               }
//               className="h-11 rounded-xl bg-[#aa4825] px-7 text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
//             >
//               {isSentToDevelopment
//                 ? "Sent to Development"
//                 : isSendingToDevelopment
//                   ? "Sending tasks..."
//                   : "Send Tasks to Developer"}
//             </button>
//           </div>
//         </>
//       )}
//     </section>
//   );
// }

// function ResponsibilityPanel({
//   selectedPrd,
//   responsibility,
// }: {
//   selectedPrd: PmPrd;
//   responsibility: Responsibility[];
// }) {
//   return (
//     <section>
//       <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//         Developer responsibility
//       </p>

//       <h1 className="mt-4 text-4xl font-semibold tracking-tight">
//         {selectedPrd.title}
//       </h1>

//       <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
//         Ownership is generated from this specific PRD only. Different PRDs will
//         show different responsibility sections.
//       </p>

//       <div className="mt-10 space-y-6">
//         {responsibility.map((item) => (
//           <section
//             key={item.role}
//             className="border-b border-white/10 pb-7 last:border-b-0"
//           >
//             <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
//               Done by
//             </p>

//             <h2 className="mt-3 text-2xl font-semibold text-[#ff9c73]">
//               {item.role}
//             </h2>

//             <p className="mt-3 text-lg font-semibold text-white">
//               {item.heading}
//             </p>

//             <ul className="mt-5 space-y-3 text-sm leading-7 text-white/55">
//               {item.details.map((detail) => (
//                 <li key={detail}>• {detail}</li>
//               ))}
//             </ul>
//           </section>
//         ))}
//       </div>
//     </section>
//   );
// }

// function PanelButton({
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
//       className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
//         active
//           ? "bg-white/10 text-white"
//           : "text-white/45 hover:bg-white/5 hover:text-white"
//       }`}
//     >
//       {label}
//     </button>
//   );
// }

// function compactSectionBody(body: string) {
//   const lines = body
//     .split("\n")
//     .map((line) => line.replace(/^[-•]\s*/, "").trim())
//     .filter(Boolean);

//   if (lines.length <= 1) {
//     return lines.join("");
//   }

//   return lines.map((line) => `- ${line}`).join("\n");
// }

// function formatPrdAsHeadingDashDetails(content: string) {
//   return splitTextIntoSections(content)
//     .map((section) => {
//       const body = compactSectionBody(section.body);

//       if (!body) {
//         return section.heading;
//       }

//       if (body.includes("\n")) {
//         return `${section.heading} -\n${body}`;
//       }

//       return `${section.heading} - ${body}`;
//     })
//     .join("\n\n");
// }

// function shouldFormatAsHeadingDashDetails(content: string) {
//   return !content
//     .split("\n")
//     .some((line) => line.includes(" - ") && line.trim().length > 8);
// }

// function splitTextIntoSections(content: string) {
//   const headings = [
//     "Problem statement",
//     "Requested change",
//     "Change impact",
//     "Acceptance criteria",
//     "Edge cases",
//     "Success metrics",
//     "Additional client details",
//     "PM notes",
//   ];

//   const sections: Array<{ heading: string; body: string }> = [];

//   for (let index = 0; index < headings.length; index++) {
//     const heading = headings[index];
//     const nextHeading = headings[index + 1];
//     const start = content.indexOf(heading);

//     if (start === -1) {
//       continue;
//     }

//     const bodyStart = start + heading.length;
//     const end = nextHeading ? content.indexOf(nextHeading, bodyStart) : -1;

//     sections.push({
//       heading,
//       body:
//         end === -1
//           ? content.slice(bodyStart).trim()
//           : content.slice(bodyStart, end).trim(),
//     });
//   }

//   if (sections.length === 0) {
//     return [
//       {
//         heading: "PRD details",
//         body: content,
//       },
//     ];
//   }

//   return sections;
// }

// // function updatePrdSectionContent({
// //   content,
// //   heading,
// //   body,
// // }: {
// //   content: string;
// //   heading: string;
// //   body: string;
// // }) {
// //   const sections = splitTextIntoSections(content);
// //   const sectionExists = sections.some((section) => section.heading === heading);

// //   const nextSections = sectionExists
// //     ? sections.map((section) =>
// //         section.heading === heading
// //           ? {
// //               ...section,
// //               body,
// //             }
// //           : section,
// //       )
// //     : [
// //         ...sections,
// //         {
// //           heading,
// //           body,
// //         },
// //       ];

// //   return nextSections
// //     .map((section) => `${section.heading}\n${section.body.trim()}`)
// //     .join("\n\n");
// // }

// function getStatusLabel(status: string) {
//   if (status === "NEEDS_PM_REVIEW") return "Needs PM Review";
//   if (status === "PM_UPDATES_SAVED") return "PM Updated";
//   if (status === "FINALIZED_PRD") return "Finalized PRD";
//   if (status === "SENT_TO_PM") return "Sent to PM";
//   if (status === "SENT_TO_DEVELOPMENT") return "Sent to Development";
//   return status;
// }

// function getPrdPreview(content: string) {
//   const lines = content
//     .split("\n")
//     .map((line) => line.trim())
//     .filter(Boolean);

//   return lines.slice(0, 4).join(" ");
// }

// function splitFinalPrdForDisplay(content: string) {
//   const knownHeadings = [
//     "Problem statement",
//     "Requested change",
//     "Change impact",
//     "Acceptance criteria",
//     "Edge cases",
//     "Success metrics",
//     "Additional client details",
//   ];

//   const sections: Array<{ heading: string; body: string }> = [];
//   let currentSection: { heading: string; body: string[] } | null = null;

//   const lines = content
//     .split("\n")
//     .map((line) => line.trim())
//     .filter(Boolean);

//   function pushCurrentSection() {
//     if (!currentSection) {
//       return;
//     }

//     sections.push({
//       heading: currentSection.heading,
//       body: currentSection.body.join("\n").trim(),
//     });
//   }

//   for (const line of lines) {
//     const knownHeading = knownHeadings.find(
//       (heading) => line.toLowerCase() === heading.toLowerCase(),
//     );

//     if (knownHeading) {
//       pushCurrentSection();

//       currentSection = {
//         heading: knownHeading,
//         body: [],
//       };

//       continue;
//     }

//     const knownHeadingWithBody = knownHeadings.find((heading) =>
//       line.toLowerCase().startsWith(`${heading.toLowerCase()} -`),
//     );

//     if (knownHeadingWithBody) {
//       pushCurrentSection();

//       const body = line
//         .slice(knownHeadingWithBody.length)
//         .replace(/^[-:]+/, "")
//         .trim();

//       currentSection = {
//         heading: knownHeadingWithBody,
//         body: body ? [body] : [],
//       };

//       continue;
//     }

//     const customHeadingMatch = line.match(
//       /^(.{3,60}?)(?:\s*--\s*|\s+-\s+|\s*:\s+)(.+)$/,
//     );

//     if (customHeadingMatch && !line.startsWith("-") && !line.startsWith("•")) {
//       pushCurrentSection();

//       currentSection = {
//         heading: customHeadingMatch[1].trim(),
//         body: [customHeadingMatch[2].trim()],
//       };

//       continue;
//     }

//     if (!currentSection) {
//       currentSection = {
//         heading: "Final PRD",
//         body: [],
//       };
//     }

//     currentSection.body.push(line);
//   }

//   pushCurrentSection();

//   return sections.length > 0
//     ? sections
//     : [
//         {
//           heading: "Final PRD",
//           body: content,
//         },
//       ];
// }

// function getDeveloperResponsibility(content: string): Responsibility[] {
//   const lower = content.toLowerCase();
//   const responsibilities: Responsibility[] = [];

//   if (
//     lower.includes("logo") ||
//     lower.includes("brand") ||
//     lower.includes("header")
//   ) {
//     responsibilities.push({
//       role: "UI Designer / Frontend Developer",
//       heading: "Branding and visible interface update",
//       details: [
//         "Update the logo or brand element only in the locations mentioned in this PRD.",
//         "Confirm the correct asset, size, spacing, and placement before implementation.",
//         "Verify that the branding update does not break header, navigation, landing page, auth page, or dashboard layout.",
//       ],
//     });
//   }

//   if (
//     lower.includes("image") ||
//     lower.includes("picture") ||
//     lower.includes("landing") ||
//     lower.includes("hero") ||
//     lower.includes("responsive") ||
//     lower.includes("layout")
//   ) {
//     responsibilities.push({
//       role: "Frontend Developer",
//       heading: "Landing page and responsive UI implementation",
//       details: [
//         "Add or update the image content in the exact landing page section described in the PRD.",
//         "Handle desktop and mobile layout behavior carefully.",
//         "Verify image loading, spacing, alignment, and visual hierarchy.",
//       ],
//     });
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
//     responsibilities.push({
//       role: "Backend Developer",
//       heading: "Backend, API, authentication, or data workflow",
//       details: [
//         "Update the server-side logic required by this PRD.",
//         "Verify data access, validation, permissions, and role-based behavior.",
//         "Ensure the change does not break existing project or user workflows.",
//       ],
//     });
//   }

//   if (
//     lower.includes("performance") ||
//     lower.includes("optimize") ||
//     lower.includes("optimization") ||
//     lower.includes("security") ||
//     lower.includes("architecture") ||
//     lower.includes("refactor") ||
//     lower.includes("scalable") ||
//     lower.includes("slow")
//   ) {
//     responsibilities.push({
//       role: "Senior Developer",
//       heading: "Architecture, optimization, or technical quality",
//       details: [
//         "Review the technical approach before implementation starts.",
//         "Check performance, maintainability, security, and regression risk.",
//         "Guide developers if this PRD affects multiple files or core architecture.",
//       ],
//     });
//   }

//   if (
//     lower.includes("copy") ||
//     lower.includes("text") ||
//     lower.includes("content") ||
//     lower.includes("message") ||
//     lower.includes("wording")
//   ) {
//     responsibilities.push({
//       role: "Product Manager / Content Owner",
//       heading: "Content and product wording decision",
//       details: [
//         "Confirm the exact wording or product message before development.",
//         "Ensure the change matches business context and user expectations.",
//         "Approve the final visible content before engineering handoff.",
//       ],
//     });
//   }

//   if (responsibilities.length === 0) {
//     responsibilities.push({
//       role: "Senior Engineer",
//       heading: "Scope review and technical ownership decision",
//       details: [
//         "Review the finalized PRD and identify the correct implementation owner.",
//         "Break down the work based on affected product area and technical scope.",
//         "Confirm whether frontend, backend, QA, or design support is required.",
//       ],
//     });
//   }

//   return responsibilities;
// }

// function Badge({ label }: { label: string }) {
//   return (
//     <span className="rounded-full border border-[#aa4825]/40 bg-[#aa4825]/10 px-3 py-1 text-xs text-[#ff8a50]">
//       {label}
//     </span>
//   );
// }

// function formatOwnerRole(role: string) {
//   if (role === "UI_DESIGNER") return "UI Designer";
//   if (role === "FRONTEND_DEVELOPER") return "Frontend Developer";
//   if (role === "BACKEND_DEVELOPER") return "Backend Developer";
//   if (role === "SENIOR_DEVELOPER") return "Senior Developer";
//   if (role === "QA_REVIEWER") return "QA Reviewer";
//   return role;
// }

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoomLogo } from "@/components/brand/loom-logo";

type ProjectSummary = {
  id: string;
  name: string;
  repoFullName: string;
  defaultBranch: string;
};

type PmUser = {
  name: string;
  email: string;
};

type DevelopmentTask = {
  id: string;
  title: string;
  ownerRole: string;
  summary: string;
  workItems: string[];
  affectedFiles: string[];
  status: string;
};

type PmPrd = {
  prdId: string;
  requestId: string;
  projectId: string;
  title: string;
  originalContent: string;
  updatedContent: string;
  finalContent: string;
  pmNotes: string;
  status: string;
  sentAt: string;
};

type ActivePanel = "prds" | "update" | "final" | "responsibility";

export default function PmDashboardClient({
  mode,
  user,
  project,
  prds,
}: {
  mode: "PM" | "ADMIN_PREVIEW";
  user: PmUser;
  project: ProjectSummary;
  prds: PmPrd[];
}) {
  const [items, setItems] = useState<PmPrd[]>(prds);
  const [selectedPrdId, setSelectedPrdId] = useState(prds[0]?.prdId ?? "");
  const [activePanel, setActivePanel] = useState<ActivePanel>("prds");
  const [editedContent, setEditedContent] = useState(
    prds[0]?.updatedContent ?? "",
  );
  const [pmNotes, setPmNotes] = useState(prds[0]?.pmNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isSendingToDevelopment, setIsSendingToDevelopment] = useState(false);
  const [developmentError, setDevelopmentError] = useState("");
  const [developmentSuccess, setDevelopmentSuccess] = useState("");

  const [generatedTasks, setGeneratedTasks] = useState<DevelopmentTask[]>([]);
  const [isAnalyzingTasks, setIsAnalyzingTasks] = useState(false);
  const [taskAnalysisError, setTaskAnalysisError] = useState("");
  const lastSelectedPrdIdRef = useRef(selectedPrdId);

  const selectedPrd = useMemo(
    () => items.find((prd) => prd.prdId === selectedPrdId) ?? null,
    [items, selectedPrdId],
  );

  useEffect(() => {
    if (!selectedPrd) {
      return;
    }

    const isDifferentPrd = lastSelectedPrdIdRef.current !== selectedPrd.prdId;

    const nextContent =
      selectedPrd.updatedContent || selectedPrd.originalContent;

    setEditedContent(
      shouldFormatAsHeadingDashDetails(nextContent)
        ? formatPrdAsHeadingDashDetails(nextContent)
        : nextContent,
    );

    setPmNotes(selectedPrd.pmNotes || "");
    setError("");
    setSuccess("");

    if (isDifferentPrd) {
  setGeneratedTasks([]);
  setDevelopmentError("");
  setDevelopmentSuccess("");
  setTaskAnalysisError("");
  lastSelectedPrdIdRef.current = selectedPrd.prdId;
}

loadSavedDevelopmentTasks(selectedPrd);
  }, [selectedPrd]);

  function openPrd(prdId: string) {
    setSelectedPrdId(prdId);
    setActivePanel("update");
  }

  async function loadSavedDevelopmentTasks(prd: PmPrd) {
  try {
    const params = new URLSearchParams({
      projectId: project.id,
      prdId: prd.prdId,
      requestId: prd.requestId,
    });

    const response = await fetch(`/api/pm/prds/tasks?${params.toString()}`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return;
    }

    if (Array.isArray(data.tasks) && data.tasks.length > 0) {
      setGeneratedTasks(data.tasks);

      if (data.status === "SENT_TO_DEVELOPMENT") {
        setItems((current) =>
          current.map((item) =>
            item.prdId === prd.prdId
              ? {
                  ...item,
                  status: "SENT_TO_DEVELOPMENT",
                }
              : item,
          ),
        );
      }
    }
  } catch {
    // keep page usable even if saved tasks fail to load
  }
}

  async function savePmChanges(mode: "SAVE_CHANGES" | "FINALIZE_PRD") {
    if (!selectedPrd) {
      return;
    }

    setError("");
    setSuccess("");

    if (!editedContent.trim()) {
      setError("PRD content is required.");
      return;
    }

    if (mode === "SAVE_CHANGES") {
      setIsSaving(true);
    } else {
      setIsFinalizing(true);
    }

    try {
      const response = await fetch("/api/pm/prds/save", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.id,
          prdId: selectedPrd.prdId,
          requestId: selectedPrd.requestId,
          title: selectedPrd.title,
          updatedContent: editedContent,
          pmNotes,
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Unable to save PRD.");
        return;
      }

      const updatedPrd = data.prd as PmPrd;

      setItems((current) =>
        current.map((prd) =>
          prd.prdId === updatedPrd.prdId ? updatedPrd : prd,
        ),
      );

      setSuccess(
        mode === "SAVE_CHANGES"
          ? "PM changes saved permanently."
          : "PRD finalized permanently.",
      );

      if (mode === "FINALIZE_PRD") {
        setActivePanel("final");
      }
    } catch {
      setError("Unable to save PRD.");
    } finally {
      setIsSaving(false);
      setIsFinalizing(false);
    }
  }

  async function analyzePrdTasks() {
    if (!selectedPrd) {
      return;
    }

    const finalContent = selectedPrd.finalContent || editedContent;

    setTaskAnalysisError("");
    setDevelopmentSuccess("");
    setDevelopmentError("");

    if (!finalContent.trim()) {
      setTaskAnalysisError(
        "Finalize the PRD before analyzing development tasks.",
      );
      return;
    }

    setIsAnalyzingTasks(true);

    try {
      const response = await fetch("/api/pm/prds/analyze-tasks", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.id,
          prdId: selectedPrd.prdId,
          requestId: selectedPrd.requestId,
          title: selectedPrd.title,
          finalContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setTaskAnalysisError(data?.error || "Unable to analyze PRD.");
        return;
      }

      setGeneratedTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setDevelopmentSuccess("AI created development tasks from this PRD.");
    } catch {
      setTaskAnalysisError("Unable to analyze PRD.");
    } finally {
      setIsAnalyzingTasks(false);
    }
  }

  async function sendToDevelopment() {
    if (!selectedPrd) {
      return;
    }

    const finalContent = selectedPrd.finalContent || editedContent;

    setDevelopmentError("");
    setDevelopmentSuccess("");

    if (!finalContent.trim()) {
      setDevelopmentError("Finalize the PRD before sending tasks.");
      return;
    }

    if (generatedTasks.length === 0) {
      setDevelopmentError(
        "Analyze the PRD and create development tasks first.",
      );
      return;
    }

    setIsSendingToDevelopment(true);

    try {
      const response = await fetch("/api/pm/prds/send-to-development", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.id,
          prdId: selectedPrd.prdId,
          requestId: selectedPrd.requestId,
          title: selectedPrd.title,
          finalContent,
          tasks: generatedTasks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDevelopmentError(data?.error || "Unable to send tasks.");
        return;
      }

      setItems((current) =>
        current.map((prd) =>
          prd.prdId === selectedPrd.prdId
            ? {
                ...prd,
                status: "SENT_TO_DEVELOPMENT",
              }
            : prd,
        ),
      );

      setDevelopmentSuccess("Tasks sent to developer portal.");
    } catch {
      setDevelopmentError("Unable to send tasks.");
    } finally {
      setIsSendingToDevelopment(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div className="grid min-h-screen lg:grid-cols-[20%_80%]">
        <aside className="sticky top-0 flex h-screen flex-col overflow-hidden border-r border-white/10 bg-[#0f0f0f] px-6 py-6">
          <div>
            <LoomLogo size="small" />

            <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">
              PM Portal
            </h2>

            <div className="mt-4 rounded-2xl border border-[#aa4825]/40 bg-[#aa4825]/10 p-3">
              <p className="text-base font-semibold text-[#ff8a50]">
                {project.name}
              </p>

              <p className="mt-1 text-sm leading-6 text-white/45">
                {project.repoFullName}
              </p>

              <p className="mt-1 text-sm text-white/35">
                {mode === "ADMIN_PREVIEW" ? "Admin preview" : "Product Manager"}
              </p>
            </div>
          </div>

          <nav className="mt-10 flex-1 overflow-hidden">
            <button
              type="button"
              onClick={() => setActivePanel("prds")}
              className={`w-full rounded-xl px-5 py-1 text-left text-lg font-semibold transition ${
                activePanel === "prds"
                  ? "bg-white/10 text-white"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              PRD
            </button>

            {selectedPrd && (
              <div className="ml-4 mt-5 space-y-1 border-l border-white/10 pl-4">
                <p className="mb-3 line-clamp-2 text-sm leading-6 text-white/45">
                  {selectedPrd.title}
                </p>

                <PanelButton
                  label="Update changes"
                  active={activePanel === "update"}
                  onClick={() => setActivePanel("update")}
                />

                <PanelButton
                  label="Final PRD"
                  active={activePanel === "final"}
                  onClick={() => setActivePanel("final")}
                />

                <PanelButton
                  label="Developer responsibility"
                  active={activePanel === "responsibility"}
                  onClick={() => setActivePanel("responsibility")}
                />
              </div>
            )}
          </nav>

          <div className="border-t border-white/10 pt-5">
            <div className="rounded-2xl bg-white/[0.04] p-4">
              <p className="truncate text-sm font-semibold text-white">
                {user.name || "Product Manager"}
              </p>

              <p className="mt-1 truncate text-xs text-white/40">
                {user.email}
              </p>

              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#aa4825]">
                {mode === "ADMIN_PREVIEW" ? "Admin preview" : "PM"}
              </p>
            </div>
          </div>
        </aside>

        <section className="min-h-screen overflow-y-auto px-10 py-10">
          {activePanel === "prds" && (
            <PrdList
              project={project}
              items={items}
              selectedPrdId={selectedPrdId}
              onOpen={openPrd}
            />
          )}

          {activePanel === "update" && selectedPrd && (
            <UpdateChangesPanel
              selectedPrd={selectedPrd}
              editedContent={editedContent}
              error={error}
              success={success}
              isSaving={isSaving}
              isFinalizing={isFinalizing}
              onContentChange={setEditedContent}
              onSave={() => savePmChanges("SAVE_CHANGES")}
              onFinalize={() => savePmChanges("FINALIZE_PRD")}
            />
          )}

          {activePanel === "final" && selectedPrd && (
            <FinalPrdPanel
              selectedPrd={selectedPrd}
              onBackToUpdate={() => setActivePanel("update")}
              onOpenResponsibility={() => setActivePanel("responsibility")}
            />
          )}

          {activePanel === "responsibility" && selectedPrd && (
            <ResponsibilityPanel
              selectedPrd={selectedPrd}
              generatedTasks={generatedTasks}
              isAnalyzingTasks={isAnalyzingTasks}
              isSendingToDevelopment={isSendingToDevelopment}
              taskAnalysisError={taskAnalysisError}
              developmentError={developmentError}
              developmentSuccess={developmentSuccess}
              onAnalyzePrdTasks={analyzePrdTasks}
              onSendToDevelopment={sendToDevelopment}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function PrdList({
  project,
  items,
  selectedPrdId,
  onOpen,
}: {
  project: ProjectSummary;
  items: PmPrd[];
  selectedPrdId: string;
  onOpen: (prdId: string) => void;
}) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
        Product Manager Review
      </p>

      <h1 className="mt-15 text-4xl font-semibold tracking-tight">
        PRD workspace
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
        Review client-generated PRDs, update missing details, finalize the PRD,
        and decide who should execute the required work.
      </p>

      <div className="mt-8 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
            No PRDs have been sent to this PM yet.
          </div>
        ) : (
          items.map((prd) => (
            <article
              key={prd.prdId}
              className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-[#aa4825]/30"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
                    PRD finalise by Client
                  </p>

                  <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                    {prd.title}
                  </h3>

                  <p className="mt-3 text-sm text-white/45">
                    Status : {getStatusLabel(prd.status)}
                  </p>

                  <p className="mt-5 max-w-4xl text-sm leading-7 text-white/45">
                    {getPrdPreview(prd.updatedContent || prd.originalContent)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpen(prd.prdId)}
                  className="h-12 rounded-xl bg-[#8e3c1e] px-6 text-sm font-semibold text-white transition hover:bg-[#b84e2b]"
                >
                  Open
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function UpdateChangesPanel({
  selectedPrd,
  editedContent,
  error,
  success,
  isSaving,
  isFinalizing,
  onContentChange,
  onSave,
  onFinalize,
}: {
  selectedPrd: PmPrd;
  editedContent: string;
  error: string;
  success: string;
  isSaving: boolean;
  isFinalizing: boolean;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onFinalize: () => void;
}) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
        Update changes
      </p>

      <h1 className="mt-10 text-4xl font-semibold tracking-tight">
        {selectedPrd.title}
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
        Review the client-generated PRD, edit only what is required, then save
        or finalize the PM-approved requirement.
      </p>

      <section className="mt-10 max-w-4xl rounded-2xl border border-white/10 bg-white/[0.015] p-5">
        <h2 className="text-xl font-semibold text-white">
          Client-generated PRD
        </h2>

        <div className="mt-5 space-y-5">
          {splitTextIntoSections(selectedPrd.originalContent).map((section) => (
            <section
              key={section.heading}
              className="grid gap-3 md:grid-cols-[190px_1fr]"
            >
              <h3 className="text-sm font-semibold leading-6 text-white/75">
                {section.heading}
              </h3>

              <p className="whitespace-pre-wrap text-sm leading-6 text-white/50">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold text-white">PM editable PRD</h2>

        <p className="mt-2 text-sm leading-7 text-white/40">
          Add missing details, refine acceptance criteria, and remove ambiguity.
          These changes will be saved permanently.
        </p>

        <textarea
          value={editedContent}
          onChange={(event) => onContentChange(event.target.value)}
          rows={10}
          placeholder="Problem statement - Write the problem here..."
          className="mt-6 max-h-[360px] w-full resize-none overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.015] px-6 py-5 text-sm leading-7 text-white outline-none transition placeholder:text-white/25 focus:border-white/25"
        />

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-xl border border-[#aa4825]/30 bg-[#aa4825]/10 p-4 text-sm text-[#ffb08a]">
            {success}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isFinalizing}
            className="h-11 rounded-xl border border-white/10 px-8 text-sm font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>

          <button
            type="button"
            onClick={onFinalize}
            disabled={isSaving || isFinalizing}
            className="h-11 rounded-xl bg-[#87371a] px-8 text-sm font-semibold text-white transition hover:bg-[#ae4522] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFinalizing ? "Finalizing..." : "Finalize PRD"}
          </button>
        </div>
      </section>
    </section>
  );
}

function FinalPrdPanel({
  selectedPrd,
  onBackToUpdate,
  onOpenResponsibility,
}: {
  selectedPrd: PmPrd;
  onBackToUpdate: () => void;
  onOpenResponsibility: () => void;
}) {
  const finalContent = selectedPrd.finalContent || "";
  const finalSections = splitFinalPrdForDisplay(finalContent);

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
        Final PRD
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        {selectedPrd.title}
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
        This is the Product Manager approved PRD. Next, analyze it into
        development tasks inside Developer responsibility.
      </p>

      {!finalContent ? (
        <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-2xl font-semibold text-white">
            Final PRD not created yet
          </h2>

          <p className="mt-3 text-sm leading-7 text-white/45">
            Go to Update changes, refine the PRD, then click Finalize PRD.
          </p>

          <button
            type="button"
            onClick={onBackToUpdate}
            className="mt-6 h-11 rounded-xl bg-[#aa4825] px-6 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
          >
            Go to Update changes
          </button>
        </div>
      ) : (
        <>
          <div className="mt-10 max-h-[520px] overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.02] p-7">
            <div className="space-y-5">
              {finalSections.map((section) => (
                <section
                  key={`${section.heading}-${section.body.slice(0, 20)}`}
                  className="grid gap-3 md:grid-cols-[210px_1fr]"
                >
                  <h2 className="text-sm font-semibold leading-7 text-white">
                    {section.heading}
                  </h2>

                  <p className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onOpenResponsibility}
              className="h-11 rounded-xl bg-[#aa4825] px-7 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
            >
              Analyze developer responsibility
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function ResponsibilityPanel({
  selectedPrd,
  generatedTasks,
  isAnalyzingTasks,
  isSendingToDevelopment,
  taskAnalysisError,
  developmentError,
  developmentSuccess,
  onAnalyzePrdTasks,
  onSendToDevelopment,
}: {
  selectedPrd: PmPrd;
  generatedTasks: DevelopmentTask[];
  isAnalyzingTasks: boolean;
  isSendingToDevelopment: boolean;
  taskAnalysisError: string;
  developmentError: string;
  developmentSuccess: string;
  onAnalyzePrdTasks: () => void;
  onSendToDevelopment: () => void;
}) {
  const finalContent = selectedPrd.finalContent || "";
  const groupedTasks = groupTasksByDeveloper(generatedTasks);
  const isSentToDevelopment = selectedPrd.status === "SENT_TO_DEVELOPMENT";

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
        Developer responsibility
      </p>

      {!finalContent ? (
        <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-2xl font-semibold text-white">
            Final PRD required
          </h2>

          <p className="mt-3 text-sm leading-7 text-white/45">
            Finalize the PRD first. After that, AI can analyze it and create
            developer-specific task cards.
          </p>
        </div>
      ) : (
        <>
          {developmentSuccess && (
            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">
              {developmentSuccess}
            </div>
          )}

          {taskAnalysisError && (
            <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {taskAnalysisError}
            </div>
          )}

          {developmentError && (
            <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {developmentError}
            </div>
          )}

          {generatedTasks.length === 0 ? (
            <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.02] p-8">
              <h2 className="text-2xl font-semibold text-white">
                No development tasks created yet
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
                Click the button below. AI will read the final PRD, understand
                the actual required change, and create only the required
                developer task cards.
              </p>

              <button
                type="button"
                onClick={onAnalyzePrdTasks}
                disabled={isAnalyzingTasks || isSentToDevelopment}
                className="mt-7 h-11 rounded-xl bg-[#963e1e] px-7 text-sm font-semibold text-white transition hover:bg-[#b14b29] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAnalyzingTasks ? "Analyzing PRD..." : "Analyze PRD with AI"}
              </button>
            </section>
          ) : (
            <>
              <div className="mt-10 space-y-6">
                {groupedTasks.map((group) => (
                  <section
                    key={group.ownerRole}
                    className="rounded-3xl border border-white/10 bg-white/[0.02] p-8"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                          Task for
                        </p>

                        <h2 className="mt-3 text-3xl font-semibold text-white">
                          {formatOwnerRole(group.ownerRole)}
                        </h2>
                      </div>

                      {/* <button
  type="button"
  onClick={onAnalyzePrdTasks}
  disabled={isAnalyzingTasks || isSentToDevelopment}
  className="h-10 rounded-xl border border-white/10 px-5 text-sm font-semibold text-white/65 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
>
  {isAnalyzingTasks ? "Regenerating..." : "Regenerate task"}
</button> */}
                    </div>

                    <div className="mt-8 space-y-8">
                      {group.tasks.map((task) => (
                        <div key={task.id}>
                          <h3 className="text-2xl font-semibold text-white">
                            {task.title}
                          </h3>

                          {task.summary && (
                            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/45">
                              {task.summary}
                            </p>
                          )}

                          <ul className="mt-6 space-y-3 text-sm leading-7 text-white/55">
                            {task.workItems.map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>

                          {task.affectedFiles.length > 0 && (
                            <div className="mt-6">
                              <p className="text-sm font-semibold text-white/70">
                                Likely files
                              </p>

                              <ul className="mt-3 space-y-2 text-sm text-white/45">
                                {task.affectedFiles.map((file) => (
                                  <li key={file}>• {file}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-8 flex flex-col justify-end gap-3 border-t border-white/10 pt-6 sm:flex-row">
                {/* <button
                  type="button"
                  onClick={onAnalyzePrdTasks}
                  disabled={isAnalyzingTasks || isSentToDevelopment}
                  className="h-11 rounded-xl border border-white/10 px-7 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAnalyzingTasks ? "Analyzing PRD..." : "Regenerate tasks"}
                </button> */}

                <button
                  type="button"
                  onClick={onSendToDevelopment}
                  disabled={isSendingToDevelopment || isSentToDevelopment}
                  className="h-11 rounded-xl bg-[#aa4825] px-7 text-sm font-semibold text-white transition hover:bg-[#8f3b1f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSentToDevelopment
                    ? "Completed"
                    : isSendingToDevelopment
                      ? "Sending tasks..."
                      : "Send task to developer"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function PanelButton({
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
      className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
        active
          ? "bg-white/10 text-white"
          : "text-white/45 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function groupTasksByDeveloper(tasks: DevelopmentTask[]) {
  const groups = new Map<string, DevelopmentTask[]>();

  for (const task of tasks) {
    const role = task.ownerRole || "SENIOR_DEVELOPER";
    const current = groups.get(role) ?? [];

    current.push(task);
    groups.set(role, current);
  }

  return Array.from(groups.entries()).map(([ownerRole, groupTasks]) => ({
    ownerRole,
    tasks: groupTasks,
  }));
}

function getDeveloperGroupSummary(role: string) {
  if (role === "UI_DESIGNER") {
    return "Design-focused work. This card contains only the tasks that require visual direction, branding, layout decisions, or UI design judgment.";
  }

  if (role === "FRONTEND_DEVELOPER") {
    return "Frontend implementation work. This card contains only the tasks that require code changes in UI components, pages, layout, or responsive behavior.";
  }

  if (role === "BACKEND_DEVELOPER") {
    return "Backend implementation work. This card contains only the tasks that require API, auth, database, route, session, or server-side workflow changes.";
  }

  if (role === "SENIOR_DEVELOPER") {
    return "Senior engineering work. This card contains only the tasks that require architecture review, optimization, security, refactor, or technical decision-making.";
  }

  if (role === "QA_REVIEWER") {
    return "Verification work. This card contains only the tasks that require testing the finalized behavior against the PRD.";
  }

  return "Tasks grouped for this developer role.";
}

function compactSectionBody(body: string) {
  const lines = body
    .split("\n")
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return lines.join("");
  }

  return lines.map((line) => `- ${line}`).join("\n");
}

function formatPrdAsHeadingDashDetails(content: string) {
  return splitTextIntoSections(content)
    .map((section) => {
      const body = compactSectionBody(section.body);

      if (!body) {
        return section.heading;
      }

      if (body.includes("\n")) {
        return `${section.heading} -\n${body}`;
      }

      return `${section.heading} - ${body}`;
    })
    .join("\n\n");
}

function shouldFormatAsHeadingDashDetails(content: string) {
  return !content
    .split("\n")
    .some((line) => line.includes(" - ") && line.trim().length > 8);
}

function splitTextIntoSections(content: string) {
  const headings = [
    "Problem statement",
    "Requested change",
    "Change impact",
    "Acceptance criteria",
    "Edge cases",
    "Success metrics",
    "Additional client details",
    "PM notes",
  ];

  const sections: Array<{ heading: string; body: string }> = [];

  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index];
    const nextHeading = headings[index + 1];
    const start = content.indexOf(heading);

    if (start === -1) {
      continue;
    }

    const bodyStart = start + heading.length;
    const end = nextHeading ? content.indexOf(nextHeading, bodyStart) : -1;

    sections.push({
      heading,
      body:
        end === -1
          ? content.slice(bodyStart).trim()
          : content.slice(bodyStart, end).trim(),
    });
  }

  if (sections.length === 0) {
    return [
      {
        heading: "PRD details",
        body: content,
      },
    ];
  }

  return sections;
}

function getStatusLabel(status: string) {
  if (status === "NEEDS_PM_REVIEW") return "Needs PM Review";
  if (status === "PM_UPDATES_SAVED") return "PM Updated";
  if (status === "FINALIZED_PRD") return "Finalized PRD";
  if (status === "SENT_TO_PM") return "Sent to PM";
  if (status === "SENT_TO_DEVELOPMENT") return "Sent to Development";
  return status;
}

function getPrdPreview(content: string) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(0, 4).join(" ");
}

function splitFinalPrdForDisplay(content: string) {
  const knownHeadings = [
    "Problem statement",
    "Requested change",
    "Change impact",
    "Acceptance criteria",
    "Edge cases",
    "Success metrics",
    "Additional client details",
  ];

  const sections: Array<{ heading: string; body: string }> = [];
  let currentSection: { heading: string; body: string[] } | null = null;

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  function pushCurrentSection() {
    if (!currentSection) {
      return;
    }

    sections.push({
      heading: currentSection.heading,
      body: currentSection.body.join("\n").trim(),
    });
  }

  for (const line of lines) {
    const knownHeading = knownHeadings.find(
      (heading) => line.toLowerCase() === heading.toLowerCase(),
    );

    if (knownHeading) {
      pushCurrentSection();

      currentSection = {
        heading: knownHeading,
        body: [],
      };

      continue;
    }

    const knownHeadingWithBody = knownHeadings.find((heading) =>
      line.toLowerCase().startsWith(`${heading.toLowerCase()} -`),
    );

    if (knownHeadingWithBody) {
      pushCurrentSection();

      const body = line
        .slice(knownHeadingWithBody.length)
        .replace(/^[-:]+/, "")
        .trim();

      currentSection = {
        heading: knownHeadingWithBody,
        body: body ? [body] : [],
      };

      continue;
    }

    const customHeadingMatch = line.match(
      /^(.{3,60}?)(?:\s*--\s*|\s+-\s+|\s*:\s+)(.+)$/,
    );

    if (customHeadingMatch && !line.startsWith("-") && !line.startsWith("•")) {
      pushCurrentSection();

      currentSection = {
        heading: customHeadingMatch[1].trim(),
        body: [customHeadingMatch[2].trim()],
      };

      continue;
    }

    if (!currentSection) {
      currentSection = {
        heading: "Final PRD",
        body: [],
      };
    }

    currentSection.body.push(line);
  }

  pushCurrentSection();

  return sections.length > 0
    ? sections
    : [
        {
          heading: "Final PRD",
          body: content,
        },
      ];
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#aa4825]/40 bg-[#aa4825]/10 px-3 py-1 text-xs text-[#ff8a50]">
      {label}
    </span>
  );
}

function formatOwnerRole(role: string) {
  if (role === "UI_DESIGNER") return "UI Designer";
  if (role === "FRONTEND_DEVELOPER") return "Frontend Developer";
  if (role === "BACKEND_DEVELOPER") return "Backend Developer";
  if (role === "SENIOR_DEVELOPER") return "Senior Developer";
  if (role === "QA_REVIEWER") return "QA Reviewer";
  return role;
}
