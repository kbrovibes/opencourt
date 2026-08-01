import { supabase } from "@/lib/supabase";
import type { EventType } from "@/lib/db/events";

export interface OcMatch {
  id: string;
  event_id: string;
  match_type: EventType;
  team1_player1_id: string;
  team1_player2_id: string | null;
  team2_player1_id: string;
  team2_player2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winning_team: 1 | 2 | null;
  status: "pending" | "completed";
  court: string | null;
  created_at: string;
  completed_at: string | null;
}

const MATCH_COLS =
  "id, event_id, match_type, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_score, team2_score, winning_team, status, court, created_at, completed_at";

export async function listMatches(eventId: string): Promise<OcMatch[]> {
  const { data, error } = await supabase
    .from("oc_matches")
    .select(MATCH_COLS)
    .eq("event_id", eventId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as OcMatch[];
}

export interface CreateMatchInput {
  event_id: string;
  match_type: EventType;
  team1_player1_id: string;
  team1_player2_id?: string | null;
  team2_player1_id: string;
  team2_player2_id?: string | null;
  court?: string | null;
}

export async function createMatch(input: CreateMatchInput): Promise<OcMatch> {
  const { data, error } = await supabase
    .from("oc_matches")
    .insert(input)
    .select(MATCH_COLS)
    .single();
  if (error) throw error;
  return data as OcMatch;
}

export async function recordScore(
  matchId: string,
  team1Score: number,
  team2Score: number
): Promise<void> {
  const { error } = await supabase
    .from("oc_matches")
    .update({
      team1_score: team1Score,
      team2_score: team2Score,
      winning_team: team1Score === team2Score ? null : team1Score > team2Score ? 1 : 2,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", matchId);
  if (error) throw error;
}

export async function deleteMatch(matchId: string): Promise<void> {
  const { error } = await supabase.from("oc_matches").delete().eq("id", matchId);
  if (error) throw error;
}

export interface StandingRow {
  playerId: string;
  wins: number;
  losses: number;
}

/** Per-player W/L across completed matches of an event. */
export function computeStandings(matches: OcMatch[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  function bump(playerId: string | null, won: boolean) {
    if (!playerId) return;
    const row = rows.get(playerId) ?? { playerId, wins: 0, losses: 0 };
    if (won) row.wins++;
    else row.losses++;
    rows.set(playerId, row);
  }
  for (const m of matches) {
    if (m.status !== "completed" || !m.winning_team) continue;
    const t1Won = m.winning_team === 1;
    bump(m.team1_player1_id, t1Won);
    bump(m.team1_player2_id, t1Won);
    bump(m.team2_player1_id, !t1Won);
    bump(m.team2_player2_id, !t1Won);
  }
  return [...rows.values()].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses
  );
}
