import { getAuthPlayer } from "@/lib/auth";
import { listEvents } from "@/lib/db/events";
import { supabase } from "@/lib/supabase";
import NavLink from "@/components/NavLink";
import EventCard from "@/components/EventCard";

export const dynamic = "force-dynamic";

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
