import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEvent } from "@/lib/db/events";
import { createMatch } from "@/lib/db/matches";

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json();
  const { event_id, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, court } = body;

  const event = event_id ? await getEvent(event_id) : null;
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const isDoubles = event.event_type === "doubles";
  const required = isDoubles
    ? [team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id]
    : [team1_player1_id, team2_player1_id];
  if (required.some((p) => !p)) {
    return NextResponse.json({ error: "All player slots are required" }, { status: 400 });
  }
  if (new Set(required).size !== required.length) {
    return NextResponse.json({ error: "A player cannot appear twice" }, { status: 400 });
  }

  try {
    const match = await createMatch({
      event_id,
      match_type: event.event_type,
      team1_player1_id,
      team1_player2_id: isDoubles ? team1_player2_id : null,
      team2_player1_id,
      team2_player2_id: isDoubles ? team2_player2_id : null,
      court: court?.trim() || null,
    });
    return NextResponse.json({ match });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
