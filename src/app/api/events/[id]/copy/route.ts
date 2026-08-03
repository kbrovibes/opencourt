import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createEvent, getEvent } from "@/lib/db/events";

/** Copy an event into a fresh draft dated today (IST). Links back via copied_from. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { player, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const source = await getEvent(id);
  if (!source) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  try {
    const event = await createEvent({
      name: source.name,
      event_date: today,
      start_time: source.start_time,
      event_type: source.event_type,
      max_players: source.max_players,
      status: "draft",
      checkin_opens_at: null,
      location: source.location,
      notes: source.notes,
      created_by: player.id,
      copied_from: source.id,
    });
    return NextResponse.json({ event });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
