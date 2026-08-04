import { redirect } from "next/navigation";
import { getAuthPlayer } from "@/lib/auth";
import { getMyLiveEvents, todayIST } from "@/lib/db/events";
import { supabase } from "@/lib/supabase";
import EventCard from "@/components/EventCard";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const player = await getAuthPlayer();
  if (!player) redirect("/welcome");

  const myLive = await getMyLiveEvents(player.id);
  const todays = myLive.filter((e) => e.event_date === todayIST());

  if (todays.length === 0) redirect("/");
  if (todays.length === 1) redirect(`/events/${todays[0].id}`);

  const { data: regRows } = await supabase
    .from("oc_event_players")
    .select("event_id")
    .in("event_id", todays.map((e) => e.id))
    .is("withdrawn_at", null);
  const counts = new Map<string, number>();
  for (const row of regRows ?? []) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-6">
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">
          Your events today ({todays.length})
        </h2>
        <div className="flex flex-col gap-2">
          {todays.map((e) => (
            <EventCard key={e.id} event={e} count={counts.get(e.id) ?? 0} />
          ))}
        </div>
      </section>
    </div>
  );
}
