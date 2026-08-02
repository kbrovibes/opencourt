import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEvent } from "@/lib/db/events";
import { listTeams } from "@/lib/db/teams";
import { createTeamMatch } from "@/lib/db/matches";

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json();
  const { event_id, team1_id, team2_id, court } = body;

  const event = event_id ? await getEvent(event_id) : null;
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.stage !== "matches_set" && event.stage !== "started") {
    return NextResponse.json({ error: "Set up matches after locking teams" }, { status: 400 });
  }
  if (!team1_id || !team2_id || team1_id === team2_id) {
    return NextResponse.json({ error: "Pick two different teams" }, { status: 400 });
  }

  const teams = await listTeams(event_id);
  const t1 = teams.find((t) => t.id === team1_id);
  const t2 = teams.find((t) => t.id === team2_id);
  if (!t1 || !t2) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  try {
    const match = await createTeamMatch(event_id, event.event_type, t1, t2, null, null);
    if (court?.trim()) {
      // court is cosmetic; set separately to keep createTeamMatch small
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("oc_matches").update({ court: court.trim() }).eq("id", match.id);
    }
    return NextResponse.json({ match });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
