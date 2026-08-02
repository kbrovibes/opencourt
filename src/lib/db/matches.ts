import { supabase } from "@/lib/supabase";
import type { EventType } from "@/lib/db/events";
import type { OcTeam } from "@/lib/db/teams";

export interface OcMatch {
  id: string;
  event_id: string;
  match_type: EventType;
  team1_id: string | null;
  team2_id: string | null;
  round: number | null;
  bracket_pos: number | null;
  team1_player1_id: string | null;
  team1_player2_id: string | null;
  team2_player1_id: string | null;
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
  "id, event_id, match_type, team1_id, team2_id, round, bracket_pos, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_score, team2_score, winning_team, status, court, created_at, completed_at";

export async function listMatches(eventId: string): Promise<OcMatch[]> {
  const { data, error } = await supabase
    .from("oc_matches")
    .select(MATCH_COLS)
    .eq("event_id", eventId)
    .order("round", { ascending: true, nullsFirst: false })
    .order("bracket_pos", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as OcMatch[];
}

function teamPlayerCols(team: OcTeam | null, slot: 1 | 2) {
  return {
    [`team${slot}_player1_id`]: team?.player1_id ?? null,
    [`team${slot}_player2_id`]: team?.player2_id ?? null,
    [`team${slot}_id`]: team?.id ?? null,
  };
}

export async function createTeamMatch(
  eventId: string,
  matchType: EventType,
  team1: OcTeam | null,
  team2: OcTeam | null,
  round: number | null = null,
  bracketPos: number | null = null
): Promise<OcMatch> {
  const { data, error } = await supabase
    .from("oc_matches")
    .insert({
      event_id: eventId,
      match_type: matchType,
      round,
      bracket_pos: bracketPos,
      ...teamPlayerCols(team1, 1),
      ...teamPlayerCols(team2, 2),
    })
    .select(MATCH_COLS)
    .single();
  if (error) throw error;
  return data as OcMatch;
}

export async function deleteMatch(matchId: string): Promise<void> {
  const { error } = await supabase.from("oc_matches").delete().eq("id", matchId);
  if (error) throw error;
}

export async function clearMatches(eventId: string): Promise<void> {
  const { error } = await supabase.from("oc_matches").delete().eq("event_id", eventId);
  if (error) throw error;
}

/**
 * Record a score. For single-elimination events the winning team is advanced
 * into its slot in the next round's match.
 */
export async function recordScore(
  matchId: string,
  team1Score: number,
  team2Score: number
): Promise<void> {
  const winningTeam = team1Score > team2Score ? 1 : 2;
  const { data: match, error } = await supabase
    .from("oc_matches")
    .update({
      team1_score: team1Score,
      team2_score: team2Score,
      winning_team: winningTeam,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select(MATCH_COLS)
    .single();
  if (error) throw error;

  const m = match as OcMatch;
  // Bracket progression
  if (m.round !== null && m.bracket_pos !== null) {
    const winnerId = winningTeam === 1 ? m.team1_id : m.team2_id;
    if (!winnerId) return;
    const { data: team } = await supabase
      .from("oc_teams")
      .select("id, event_id, player1_id, player2_id, seed, created_at")
      .eq("id", winnerId)
      .maybeSingle();
    if (!team) return;
    const nextPos = Math.floor(m.bracket_pos / 2);
    const slot: 1 | 2 = m.bracket_pos % 2 === 0 ? 1 : 2;
    const { data: nextMatch } = await supabase
      .from("oc_matches")
      .select("id")
      .eq("event_id", m.event_id)
      .eq("round", m.round + 1)
      .eq("bracket_pos", nextPos)
      .maybeSingle();
    if (nextMatch) {
      await supabase
        .from("oc_matches")
        .update(teamPlayerCols(team as OcTeam, slot))
        .eq("id", nextMatch.id);
    }
  }
}

/** Undo a recorded score (does NOT rewind bracket progression — regenerate instead). */
export async function resetScore(matchId: string): Promise<void> {
  const { error } = await supabase
    .from("oc_matches")
    .update({ team1_score: null, team2_score: null, winning_team: null, status: "pending", completed_at: null })
    .eq("id", matchId);
  if (error) throw error;
}

/**
 * Single-elimination generation. Teams seeded by `seed` (creation order).
 * Bracket size = next power of two; top seeds receive the byes and are placed
 * directly into round 2. All rounds are created up front with TBD slots.
 */
export async function generateSingleElim(eventId: string, matchType: EventType, teams: OcTeam[]): Promise<void> {
  const n = teams.length;
  if (n < 2) throw new Error("Need at least 2 teams");
  let size = 1;
  while (size < n) size *= 2;
  const rounds = Math.log2(size);
  const byes = size - n;

  // Round 1 slot layout: seeds 1..byes get byes (advance straight to round 2).
  // Remaining teams fill round-1 matches in seed order.
  const r1TeamCount = n - byes; // teams actually playing round 1
  const playing = teams.slice(byes, byes + r1TeamCount);

  // Create all matches for every round first (TBD everywhere)
  const created: Record<string, string> = {}; // `${round}:${pos}` -> match id
  for (let r = 1; r <= rounds; r++) {
    const count = size / Math.pow(2, r);
    for (let p = 0; p < count; p++) {
      const m = await createTeamMatch(eventId, matchType, null, null, r, p);
      created[`${r}:${p}`] = m.id;
    }
  }

  // Fill round 1: playing teams pair up into the LAST r1 slots (so bye seeds
  // occupy the earliest round-2 slots).
  const r1Matches = size / 2;
  const firstPlayingMatch = r1Matches - r1TeamCount / 2;
  for (let i = 0; i < r1TeamCount / 2; i++) {
    const pos = firstPlayingMatch + i;
    const t1 = playing[i * 2];
    const t2 = playing[i * 2 + 1];
    await supabase
      .from("oc_matches")
      .update({ ...teamPlayerCols(t1, 1), ...teamPlayerCols(t2, 2) })
      .eq("id", created[`1:${pos}`]);
  }

  // Place bye teams straight into round 2
  for (let i = 0; i < byes; i++) {
    const team = teams[i];
    const r2Pos = Math.floor(i / 2);
    const slot: 1 | 2 = i % 2 === 0 ? 1 : 2;
    await supabase
      .from("oc_matches")
      .update(teamPlayerCols(team, slot))
      .eq("id", created[`2:${r2Pos}`]);
  }

  // Special case: byes but only 1 round means n was already a power of 2 — handled above.
  // Remove round-1 matches that have no teams at all (pure-bye slots)
  await supabase
    .from("oc_matches")
    .delete()
    .eq("event_id", eventId)
    .eq("round", 1)
    .is("team1_id", null)
    .is("team2_id", null);
}

/** Round robin: every team plays every other team once. */
export async function generateRoundRobin(eventId: string, matchType: EventType, teams: OcTeam[]): Promise<void> {
  if (teams.length < 2) throw new Error("Need at least 2 teams");
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      await createTeamMatch(eventId, matchType, teams[i], teams[j]);
    }
  }
}

export interface TeamStanding {
  teamId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

/** Per-team W/L + points across completed matches. */
export function computeTeamStandings(matches: OcMatch[]): TeamStanding[] {
  const rows = new Map<string, TeamStanding>();
  function row(id: string): TeamStanding {
    let r = rows.get(id);
    if (!r) {
      r = { teamId: id, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
      rows.set(id, r);
    }
    return r;
  }
  for (const m of matches) {
    if (m.status !== "completed" || !m.winning_team || !m.team1_id || !m.team2_id) continue;
    const t1 = row(m.team1_id);
    const t2 = row(m.team2_id);
    t1.pointsFor += m.team1_score ?? 0;
    t1.pointsAgainst += m.team2_score ?? 0;
    t2.pointsFor += m.team2_score ?? 0;
    t2.pointsAgainst += m.team1_score ?? 0;
    if (m.winning_team === 1) {
      t1.wins++;
      t2.losses++;
    } else {
      t2.wins++;
      t1.losses++;
    }
  }
  return [...rows.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      a.losses - b.losses ||
      b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
  );
}
