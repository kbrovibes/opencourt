import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createEvent } from "@/lib/db/events";

export async function POST(request: NextRequest) {
  const { player, response } = await requireAdmin();
  if (response) return response;

  const body = await request.json();
  const { name, event_date, start_time, event_type, max_players, status, checkin_opens_at, location, notes } = body;

  if (!name?.trim() || !event_date) {
    return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
  }
  if (!["singles", "doubles"].includes(event_type)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }
  if (!["draft", "live"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const max = parseInt(max_players, 10);
  if (!Number.isFinite(max) || max < 2 || max > 500) {
    return NextResponse.json({ error: "Max players must be between 2 and 500" }, { status: 400 });
  }

  try {
    const event = await createEvent({
      name: name.trim(),
      event_date,
      start_time: start_time?.trim() || null,
      event_type,
      max_players: max,
      status,
      checkin_opens_at: checkin_opens_at || null,
      location: location?.trim() || null,
      notes: notes?.trim() || null,
      created_by: player.id,
    });
    return NextResponse.json({ event });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
