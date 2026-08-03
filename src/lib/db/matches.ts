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

/**
 * Reset every score in an event to pending and rewind bracket progression:
 * teams that reached a later knockout round by WINNING an earlier one are
 * cleared from those slots; bye seeds and standings-seeded playoff slots stay.
 */
export async function resetAllScores(eventId: string): Promise<void> {
  const matches = await listMatches(eventId);
  const { error } = await supabase
    .from("oc_matches")
    .update({ team1_score: null, team2_score: null, winning_team: null, status: "pending", completed_at: null })
    .eq("event_id", eventId);
  if (error) throw error;

  const knockout = matches.filter((m) => m.round !== null && m.bracket_pos !== null);
  if (knockout.length === 0) return;
  const minKR = Math.min(...knockout.map((m) => m.round!));
  for (const m of knockout) {
    if (m.round === minKR) continue;
    const clears: Record<string, null> = {};
    for (const slot of [1, 2] as const) {
      const tid = slot === 1 ? m.team1_id : m.team2_id;
      if (!tid) continue;
      const advancedHere = knockout.some(
        (k) => k.round! < m.round! && (k.team1_id === tid || k.team2_id === tid)
      );
      if (advancedHere) {
        clears[`team${slot}_id`] = null;
        clears[`team${slot}_player1_id`] = null;
        clears[`team${slot}_player2_id`] = null;
      }
    }
    if (Object.keys(clears).length > 0) {
      await supabase.from("oc_matches").update(clears).eq("id", m.id);
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

/** Round robin: every team plays every other team once (round = schedule round via circle method). */
export async function generateRoundRobin(eventId: string, matchType: EventType, teams: OcTeam[]): Promise<void> {
  await generateFixedRounds(eventId, matchType, teams, teams.length - 1);
}

/**
 * Fixed rounds (limited round robin): every team plays exactly `roundsPerTeam`
 * matches (capped at teams-1), scheduled with the circle method so nobody
 * plays twice in a round. Odd team counts sit out one round at a time.
 * These are group matches: round is set, bracket_pos stays null (no bracket).
 */
export async function generateFixedRounds(
  eventId: string,
  matchType: EventType,
  teams: OcTeam[],
  roundsPerTeam: number
): Promise<void> {
  if (teams.length < 2) throw new Error("Need at least 2 teams");
  const rounds = Math.max(1, Math.min(roundsPerTeam, teams.length - 1));

  const arr: (OcTeam | null)[] = [...teams];
  if (arr.length % 2 === 1) arr.push(null); // bye slot
  const n = arr.length;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a && b) await createTeamMatch(eventId, matchType, a, b, r + 1, null);
    }
    // rotate all but the first
    arr.splice(1, 0, arr.pop()!);
  }
}

/**
 * Playoffs from current standings (for round-robin / fixed-rounds events):
 * top 2 → a final; top 4 → semifinals (1v4, 2v3) + TBD final.
 * Knockout rounds are appended after the group rounds so winners auto-advance.
 */
export async function generatePlayoffs(
  eventId: string,
  matchType: EventType,
  teams: OcTeam[],
  orderedTeamIds: string[],
  size: 2 | 4
): Promise<void> {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const top = orderedTeamIds.slice(0, size).map((id) => byId.get(id)).filter(Boolean) as OcTeam[];
  if (top.length < size) throw new Error(`Need ${size} teams with completed matches for playoffs`);

  const { data } = await supabase
    .from("oc_matches")
    .select("round")
    .eq("event_id", eventId)
    .not("round", "is", null)
    .order("round", { ascending: false })
    .limit(1);
  const base = (data?.[0]?.round ?? 0) + 1;

  if (size === 2) {
    await createTeamMatch(eventId, matchType, top[0], top[1], base, 0);
  } else {
    await createTeamMatch(eventId, matchType, top[0], top[3], base, 0);
    await createTeamMatch(eventId, matchType, top[1], top[2], base, 1);
    await createTeamMatch(eventId, matchType, null, null, base + 1, 0); // final, TBD
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
