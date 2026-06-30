import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type AuditMetadata = Record<string, unknown>;

function safeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parseMetadata(metadata: unknown): AuditMetadata {
  try {
    if (!metadata) return {};

    const parsed =
      typeof metadata === "string"
        ? JSON.parse(metadata)
        : JSON.parse(JSON.stringify(metadata));

    if (!parsed || typeof parsed !== "object") return {};

    return parsed as AuditMetadata;
  } catch {
    return {};
  }
}

function getActorName(metadata: AuditMetadata) {
  return (
    safeString(metadata.mergedByName) ||
    safeString(metadata.seniorEngineerName) ||
    safeString(metadata.reviewerName) ||
    "Unknown actor"
  );
}

function getActorEmail(metadata: AuditMetadata) {
  return (
    safeString(metadata.mergedByEmail) ||
    safeString(metadata.seniorEngineerEmail) ||
    safeString(metadata.reviewerEmail) ||
    ""
  );
}

function getStatusClass(action: string) {
  if (action === "senior.pr.approved_and_merged") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (
    action === "senior.pr.changes_requested" ||
    action === "senior.pr.rejected"
  ) {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  return "border-[#aa4825]/40 bg-[#aa4825]/10 text-[#ff8a50]";
}

export default async function AdminAuditLogPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session.user.email) {
    redirect("/auth/sign-in");
  }

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      role: "ADMIN",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/auth/redirect");
  }

  const logs = await db.auditLog.findMany({
    where: {
      workspaceId: membership.workspaceId,
      action: {
        in: [
          "developer.pr.sent_to_senior",
          "senior.summary.viewed",
          "senior.pr.approved_and_merged",
          "senior.pr.changes_requested",
          "senior.pr.rejected",
        ],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return (
    <main className="min-h-screen bg-[#111111] px-10 py-10 text-white">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
          Admin Audit Log
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Senior review activity
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
          Admin can inspect developer handoff, senior review, merge, reject, and
          request-change events. This page is read-only.
        </p>
      </div>

      <div className="mt-10 space-y-4">
        {logs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
            No senior review audit activity found yet.
          </div>
        ) : (
          logs.map((log) => {
            const metadata = parseMetadata(log.metadata);
            const actorName = getActorName(metadata);
            const actorEmail = getActorEmail(metadata);

            return (
              <article
                key={log.id}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
                        log.action,
                      )}`}
                    >
                      {log.action}
                    </span>

                    <h2 className="mt-4 text-xl font-semibold text-white">
                      {safeString(metadata.taskTitle) ||
                        safeString(metadata.pullRequestTitle) ||
                        log.entityType}
                    </h2>

                    <p className="mt-2 text-sm text-white/45">
                      {safeString(metadata.message) ||
                        safeString(metadata.reason) ||
                        "No message provided."}
                    </p>
                  </div>

                  <p className="text-xs text-white/35">
                    {log.createdAt.toLocaleString()}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-[#101010] p-4">
                    <p className="text-xs text-white/35">Actor</p>
                    <p className="mt-2 text-sm text-white/70">
                      {actorName}
                    </p>
                    {actorEmail ? (
                      <p className="mt-1 text-xs text-white/35">
                        {actorEmail}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#101010] p-4">
                    <p className="text-xs text-white/35">Repository</p>
                    <p className="mt-2 break-all text-sm text-white/70">
                      {safeString(metadata.repository) || "Not recorded"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#101010] p-4">
                    <p className="text-xs text-white/35">Status</p>
                    <p className="mt-2 text-sm text-white/70">
                      {safeString(metadata.status) || "Recorded"}
                    </p>
                  </div>
                </div>

                {safeString(metadata.pullRequestUrl) ? (
                  <a
                    href={safeString(metadata.pullRequestUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block break-all text-sm text-[#ff9c73] underline-offset-4 hover:underline"
                  >
                    {safeString(metadata.pullRequestUrl)}
                  </a>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}