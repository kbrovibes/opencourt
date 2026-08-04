import { getAuthPlayer } from "@/lib/auth";
import { listEvents, todayIST } from "@/lib/db/events";
import { supabase } from "@/lib/supabase";
import EventsHomeClient from "@/components/EventsHomeClient";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const player = await getAuthPlayer();
  const isAdmin = player?.isAdmin ?? false;

  const [events, { data: regRows }] = await Promise.all([
    listEvents(isAdmin),
    supabase.from("oc_event_players").select("event_id").is("withdrawn_at", null),
  ]);

  const counts: Record<string, number> = {};
  for (const row of regRows ?? []) {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  }

  return <EventsHomeClient events={events} counts={counts} isAdmin={isAdmin} todayISO={todayIST()} />;
}
