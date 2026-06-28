import Link from "next/link";
import { requireRole } from "@/lib/role-routing";
import { db } from "@shipflow/db";

type ClientTicketListItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  rawDescription: string;
  project: {
    name: string;
  };
};

export default async function ClientTicketsPage() {
  const { session } = await requireRole(["CLIENT"]);

  const ticketsRaw = await db.featureRequest.findMany({
    where: {
      clientId: session.user.id,
    },
    include: {
      project: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const tickets = ticketsRaw as ClientTicketListItem[];

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-orange-300">Customer Portal</p>
            <h1 className="text-2xl font-semibold">My Tickets</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
            >
              Dashboard
            </Link>

            <Link
              href="/portal/tickets/new"
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-black hover:bg-orange-400"
            >
              Raise Request
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {tickets.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
            <h2 className="text-3xl font-semibold">No tickets yet</h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Raise a feature request, bug report, improvement, or new product
              request from your assigned project.
            </p>

            <Link
              href="/portal/tickets/new"
              className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-medium text-black hover:bg-orange-400"
            >
              Raise first request
            </Link>
          </section>
        ) : (
          <section className="grid gap-5">
            {tickets.map((ticket: ClientTicketListItem) => (
              <Link
                key={ticket.id}
                href={`/portal/tickets/${ticket.id}`}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-orange-500/40 hover:bg-white/[0.06]"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold">{ticket.title}</h2>

                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                        {ticket.type}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Project: {ticket.project.name}
                    </p>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                      {ticket.rawDescription}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                    <p className="text-slate-500">Status</p>

                    <p className="mt-1 font-semibold text-orange-300">
                      {ticket.status}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}