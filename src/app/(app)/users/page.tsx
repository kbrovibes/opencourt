import { getAuthPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listEvents, getEvent, getRoster, type OcEvent } from "@/lib/db/events";
import { listPlayers } from "@/lib/db/players";
import UsersAdminClient from "./UsersAdminClient";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const player = await getAuthPlayer();
  if (!player?.isAdmin) redirect("/");

  const { event: eventParam } = await searchParams;
  const [events, players] = await Promise.all([listEvents(true), listPlayers(true)]);
  const openEvents = events.filter((e) => e.status === "live" || e.status === "draft");

  let selected: OcEvent | null = null;
  if (eventParam) {
    selected = openEvents.find((e) => e.id === eventParam) ?? (await getEvent(eventParam));
  } else if (openEvents.length === 1) {
    selected = openEvents[0];
  }

  const roster = selected ? await getRoster(selected) : [];

  return (
    <UsersAdminClient
      openEvents={openEvents.map((e) => ({ id: e.id, name: e.name, event_date: e.event_date, status: e.status }))}
      selectedEventId={selected?.id ?? null}
      players={players.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        linked: !!p.user_id,
        skill: p.skill_level,
        isAdmin: p.is_admin,
        disabled: p.disabled,
      }))}
      roster={roster.map((r) => ({
        player_id: r.player_id,
        checked_in_at: r.checked_in_at,
        waitlisted: r.waitlisted,
      }))}
    />
  );
}
