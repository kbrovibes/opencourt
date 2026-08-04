import { supabase } from "@/lib/supabase";
import { computeTeamStandings, type OcMatch } from "@/lib/db/matches";

export interface PlayerStats {
  tournamentsPlayed: number;
  eventsWon: number;
  matchesPlayed: number;
  matchesWon: number;
  recentEvents: { id: string; name: string; event_date: string; status: string }[];
}

const M_COLS =
  "id, event_id, match_type, team1_id, team2_id, round, bracket_pos, group_no, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_score, team2_score, winning_team, status, court, created_at, completed_at";

/** Which team won a finished event (knockout final clinch, else group standings leader). */
function eventWinnerTeam(ms: OcMatch[]): string | null {
  const done = ms.filter((m) => m.status === "completed");
  if (done.length === 0) return null;
  const knockout = ms.filter((m) => m.round !== null && m.bracket_pos !== null);
  if (knockout.length > 0) {
    const maxKR = Math.max(...knockout.map((m) => m.round!));
    const finals = knockout.filter((m) => m.round === maxKR);
    const need = Math.floor(finals.length / 2) + 1;
    const wins = new Map<string, number>();
    for (const f of finals) {
      if (f.status !== "completed" || !f.winning_team) continue;
      const w = f.winning_team === 1 ? f.team1_id : f.team2_id;
      if (w) wins.set(w, (wins.get(w) ?? 0) + 1);
    }
    const leader = [...wins.entries()].sort((a, b) => b[1] - a[1])[0];
    return leader && leader[1] >= need ? leader[0] : null;
  }
  if (!ms.every((m) => m.status === "completed")) return null;
  const standings = computeTeamStandings(ms);
  return standings[0]?.teamId ?? null;
}

/** Career stats for the profile page. */
export async function getPlayerStats(playerId: string, recentLimit = 5): Promise<PlayerStats> {
  const [{ data: eps }, { data: ms }] = await Promise.all([
    supabase
      .from("oc_event_players")
      .select("checked_in_at, oc_events!inner(id, name, event_date, status, deleted_at)")
      .eq("player_id", playerId)
      .is("withdrawn_at", null)
      .is("oc_events.deleted_at", null),
    supabase
      .from("oc_matches")
      .select("status, winning_team, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id")
      .or(
        `team1_player1_id.eq.${playerId},team1_player2_id.eq.${playerId},team2_player1_id.eq.${playerId},team2_player2_id.eq.${playerId}`
      ),
  ]);

  const checkedIn = (eps ?? []).filter((r) => r.checked_in_at);
  const events = checkedIn
    .map((r) => r.oc_events as unknown as { id: string; name: string; event_date: string; status: string })
    .filter(Boolean)
    .sort((a, b) => b.event_date.localeCompare(a.event_date));

  const completed = (ms ?? []).filter((m) => m.status === "completed" && m.winning_team);
  const won = completed.filter((m) => {
    const winners =
      m.winning_team === 1
        ? [m.team1_player1_id, m.team1_player2_id]
        : [m.team2_player1_id, m.team2_player2_id];
    return winners.includes(playerId);
  });

  // Events won: champion team of each finished event contains this player
  let eventsWon = 0;
  const doneEventIds = events.filter((e) => e.status === "completed").map((e) => e.id);
  if (doneEventIds.length > 0) {
    const { data: allMs } = await supabase.from("oc_matches").select(M_COLS).in("event_id", doneEventIds);
    const byEvent = new Map<string, OcMatch[]>();
    for (const m of (allMs ?? []) as unknown as OcMatch[]) {
      const list = byEvent.get(m.event_id) ?? [];
      list.push(m);
      byEvent.set(m.event_id, list);
    }
    for (const [, list] of byEvent) {
      const winner = eventWinnerTeam(list);
      if (!winner) continue;
      const finalsMatch = list.find((m) => m.team1_id === winner || m.team2_id === winner);
      if (!finalsMatch) continue;
      const members =
        finalsMatch.team1_id === winner
          ? [finalsMatch.team1_player1_id, finalsMatch.team1_player2_id]
          : [finalsMatch.team2_player1_id, finalsMatch.team2_player2_id];
      if (members.includes(playerId)) eventsWon++;
    }
  }

  return {
    tournamentsPlayed: events.length,
    eventsWon,
    matchesPlayed: completed.length,
    matchesWon: won.length,
    recentEvents: events.slice(0, recentLimit),
  };
}
