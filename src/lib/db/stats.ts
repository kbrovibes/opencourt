import { supabase } from "@/lib/supabase";

export interface PlayerStats {
  tournamentsPlayed: number;
  matchesPlayed: number;
  matchesWon: number;
  recentEvents: { id: string; name: string; event_date: string; status: string }[];
}

/** Career stats for the profile page — cheap two-query aggregate. */
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

  return {
    tournamentsPlayed: events.length,
    matchesPlayed: completed.length,
    matchesWon: won.length,
    recentEvents: events.slice(0, recentLimit),
  };
}
