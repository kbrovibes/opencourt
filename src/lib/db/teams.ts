import { supabase } from "@/lib/supabase";
import type { OcEvent } from "@/lib/db/events";
import { getRoster } from "@/lib/db/events";

export interface OcTeam {
  id: string;
  event_id: string;
  player1_id: string;
  player2_id: string | null;
  seed: number;
  created_at: string;
}

const TEAM_COLS = "id, event_id, player1_id, player2_id, seed, created_at";

export async function listTeams(eventId: string): Promise<OcTeam[]> {
  const { data, error } = await supabase
    .from("oc_teams")
    .select(TEAM_COLS)
    .eq("event_id", eventId)
    .order("seed");
  if (error) throw error;
  return data ?? [];
}

async function nextSeed(eventId: string): Promise<number> {
  const { data } = await supabase
    .from("oc_teams")
    .select("seed")
    .eq("event_id", eventId)
    .order("seed", { ascending: false })
    .limit(1);
  return (data?.[0]?.seed ?? 0) + 1;
}

export async function createTeam(
  eventId: string,
  player1Id: string,
  player2Id: string | null
): Promise<OcTeam> {
  const seed = await nextSeed(eventId);
  const { data, error } = await supabase
    .from("oc_teams")
    .insert({ event_id: eventId, player1_id: player1Id, player2_id: player2Id, seed })
    .select(TEAM_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase.from("oc_teams").delete().eq("id", teamId);
  if (error) throw error;
}

export async function clearTeams(eventId: string): Promise<void> {
  const { error } = await supabase.from("oc_teams").delete().eq("event_id", eventId);
  if (error) throw error;
}

/** Doubles: create teams from mutual (confirmed) partner picks that aren't already in a team. */
export async function teamsFromConfirmedPairs(event: OcEvent): Promise<number> {
  const [roster, existing] = await Promise.all([getRoster(event), listTeams(event.id)]);
  const taken = new Set(existing.flatMap((t) => [t.player1_id, t.player2_id]).filter(Boolean));
  const partnerOf = new Map(
    roster.filter((r) => r.checked_in_at).map((r) => [r.player_id, r.partner_id])
  );
  let created = 0;
  const paired = new Set<string>();
  for (const [pid, partner] of partnerOf) {
    if (!partner || paired.has(pid) || paired.has(partner)) continue;
    if (taken.has(pid) || taken.has(partner)) continue;
    if (partnerOf.get(partner) === pid) {
      await createTeam(event.id, pid, partner);
      paired.add(pid);
      paired.add(partner);
      created++;
    }
  }
  return created;
}

/** Singles: one team per checked-in player (skipping players already in a team). */
export async function teamsFromCheckedInSingles(event: OcEvent): Promise<number> {
  const [roster, existing] = await Promise.all([getRoster(event), listTeams(event.id)]);
  const taken = new Set(existing.map((t) => t.player1_id));
  let created = 0;
  for (const r of roster) {
    if (!r.checked_in_at || taken.has(r.player_id)) continue;
    await createTeam(event.id, r.player_id, null);
    created++;
  }
  return created;
}
