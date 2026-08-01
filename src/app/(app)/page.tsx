import { getAuthPlayer } from "@/lib/auth";
import { listEvents, type OcEvent } from "@/lib/db/events";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import NavLink from "@/components/NavLink";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function EventCard({ event, count }: { event: OcEvent; count: number }) {
  return (
    <NavLink
      href={`/events/${event.id}`}
      className="block bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3 hover:bg-surface-alt transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-heading text-[15px] truncate">{event.name}</span>
        <StatusBadge status={event.status} />
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
        <span>🗓️ {formatDate(event.event_date)}{event.start_time ? ` · ${event.start_time}` : ""}</span>
        <span className="capitalize">{event.event_type === "doubles" ? "🤝 Doubles" : "🏸 Singles"}</span>
        <span>👥 {count}/{event.max_players}</span>
      </div>
    </NavLink>
  );
}

export default async function EventsPage() {
  const player = await getAuthPlayer();
  const isAdmin = player?.isAdmin ?? false;

  const [events, { data: regRows }] = await Promise.all([
    listEvents(isAdmin),
    supabase.from("oc_event_players").select("event_id").is("withdrawn_at", null),
  ]);

  const counts = new Map<string, number>();
  for (const row of regRows ?? []) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  const live = events.filter((e) => e.status === "live");
  const drafts = events.filter((e) => e.status === "draft");
  const past = events.filter((e) => e.status === "completed" || e.status === "cancelled");

  return (
    <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-6">
      {isAdmin && (
        <NavLink
          href="/events/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-stone-900 dark:bg-sky-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-stone-800 dark:hover:bg-sky-500 transition-colors"
        >
          + Create Event
        </NavLink>
      )}

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">Ongoing & Open</h2>
        {live.length === 0 ? (
          <p className="text-sm text-muted px-1">No open events right now.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {live.map((e) => <EventCard key={e.id} event={e} count={counts.get(e.id) ?? 0} />)}
          </div>
        )}
      </section>

      {isAdmin && drafts.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">Drafts (admin only)</h2>
          <div className="flex flex-col gap-2">
            {drafts.map((e) => <EventCard key={e.id} event={e} count={counts.get(e.id) ?? 0} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">Past</h2>
          <div className="flex flex-col gap-2">
            {past.slice(0, 10).map((e) => <EventCard key={e.id} event={e} count={counts.get(e.id) ?? 0} />)}
          </div>
        </section>
      )}
    </div>
  );
}
