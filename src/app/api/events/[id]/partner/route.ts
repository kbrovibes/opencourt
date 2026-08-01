import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getEvent, getRoster, setPartner } from "@/lib/db/events";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { player, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.event_type !== "doubles") {
    return NextResponse.json({ error: "Partners only apply to doubles events" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const partnerId: string | null = body.partnerId ?? null;
  // Admins may set anyone's partner; everyone else only their own
  const targetId = body.playerId && player.isAdmin ? body.playerId : player.id;

  const roster = await getRoster(event);
  const me = roster.find((r) => r.player_id === targetId);
  if (!me?.checked_in_at) {
    return NextResponse.json({ error: "Check in before picking a partner" }, { status: 400 });
  }
  if (partnerId) {
    if (partnerId === targetId) {
      return NextResponse.json({ error: "Cannot partner with yourself" }, { status: 400 });
    }
    const partner = roster.find((r) => r.player_id === partnerId);
    if (!partner?.checked_in_at) {
      return NextResponse.json({ error: "Partner must be checked in" }, { status: 400 });
    }
  }

  try {
    await setPartner(id, targetId, partnerId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
