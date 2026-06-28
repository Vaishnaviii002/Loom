import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";

const clientStatusMap: Record<string, string> = {
  SUBMITTED: "Submitted",
  DISCOVERY: "In Discovery",
  PRD_DRAFT: "In PRD",
  PRD_APPROVED: "Approved",
  PLANNING: "Planning",
  IN_DEV: "In Development",
  IN_REVIEW: "In Review",
  FIX_NEEDED: "Fix Needed",
  PENDING_APPROVAL: "Pending Final Approval",
  SHIPPED: "Shipped",
  REJECTED: "Rejected",
};

type TicketConversationMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

type TicketDetail = {
  id: string;
  title: string;
  type: string;
  status: string;
  rawDescription: string;
  project: {
    name: string;
  };
  conversationMessages: TicketConversationMessage[];
};

export default async function ClientTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session } = await requireRole(["CLIENT"]);

  const ticketRaw = await db.featureRequest.findFirst({
    where: {
      id,
      clientId: session.user.id,
    },
    include: {
      project: true,
      conversationMessages: {
        orderBy: {
          createdAt: "asc",
        },
      },
      prd: {
        include: {
          acceptanceCriteria: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  });

  if (!ticketRaw) {
    notFound();
  }

  const ticket = ticketRaw as TicketDetail;

  const lifecycle = [
    "SUBMITTED",
    "DISCOVERY",
    "PRD_DRAFT",
    "PRD_APPROVED",
    "PLANNING",
    "IN_DEV",
    "IN_REVIEW",
    "FIX_NEEDED",
    "PENDING_APPROVAL",
    "SHIPPED",
  ];

  const currentIndex = lifecycle.indexOf(ticket.status);

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">Ticket Detail</p>
            <h1 className="text-2xl font-semibold">{ticket.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal/tickets"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
            >
              My Tickets
            </Link>

            <Link
              href="/portal/tickets/new"
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-black hover:bg-orange-400"
            >
              Raise Another
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_420px]">
        <section className="space-y-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <div className="mb-4 flex flex-wrap gap-3">
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                {ticket.type}
              </span>

              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                {clientStatusMap[ticket.status] ?? ticket.status}
              </span>
            </div>

            <h2 className="text-4xl font-semibold">{ticket.title}</h2>

            <p className="mt-3 text-sm text-slate-500">
              Project: {ticket.project.name}
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-medium text-slate-300">
                Initial request
              </p>

              <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-400">
                {ticket.rawDescription}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <h3 className="text-xl font-semibold">AI discovery conversation</h3>

            <div className="mt-5 space-y-4">
              {ticket.conversationMessages.length === 0 && (
                <p className="text-sm text-slate-400">
                  AI discovery has not started yet.
                </p>
              )}

              {ticket.conversationMessages.map(
                (message: TicketConversationMessage) => (
                  <div
                    key={message.id}
                    className={`rounded-2xl border p-4 ${
                      message.role === "USER"
                        ? "border-orange-500/20 bg-orange-500/10"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {message.role === "USER" ? "Client" : "ShipFlow AI"}
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {message.content}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold">Status tracker</h3>

            <div className="mt-5 space-y-3">
              {lifecycle.map((status, index) => {
                const isDone = currentIndex !== -1 && index < currentIndex;
                const isCurrent = index === currentIndex;

                return (
                  <div
                    key={status}
                    className={`rounded-2xl border p-4 ${
                      isCurrent
                        ? "border-orange-500/40 bg-orange-500/10"
                        : isDone
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-white/10 bg-black/20"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? "text-orange-300"
                          : isDone
                            ? "text-emerald-300"
                            : "text-slate-500"
                      }`}
                    >
                      {clientStatusMap[status] ?? status}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-semibold">What happens next?</h3>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              ShipFlow AI will clarify the requirement, then the Product Manager
              will review it and generate a PRD. After approval, the engineering
              team will plan tasks, implement through GitHub PRs, run AI review,
              fix issues, and wait for final human approval.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}