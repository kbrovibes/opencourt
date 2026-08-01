import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { checkinOpen, getEvent, getRoster, setCheckedIn } from "@/lib/db/events";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { player, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const checkedIn = body.checkedIn !== false;
  // Admins may check in any player; everyone else only themselves
  const targetId = body.playerId && player.isAdmin ? body.playerId : player.id;

  if (!player.isAdmin) {
    if (!checkinOpen(event)) {
      return NextResponse.json({ error: "Check-in is not open yet" }, { status: 400 });
    }
    if (checkedIn) {
      const roster = await getRoster(event);
      const checkedInCount = roster.filter((r) => r.checked_in_at && r.player_id !== targetId).length;
      if (checkedInCount >= event.max_players) {
        return NextResponse.json({ error: "Event is full" }, { status: 400 });
      }
    }
  }

  try {
    await setCheckedIn(id, targetId, checkedIn);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
