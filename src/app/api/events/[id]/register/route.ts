import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getEvent, registerPlayer, withdrawPlayer } from "@/lib/db/events";

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
  const withdraw = body.withdraw === true;
  // Admins may register/withdraw any player; everyone else only themselves
  const targetId = body.playerId && player.isAdmin ? body.playerId : player.id;

  if (!player.isAdmin && event.status !== "live") {
    return NextResponse.json({ error: "Event is not open for registration" }, { status: 400 });
  }

  try {
    if (withdraw) {
      await withdrawPlayer(id, targetId);
    } else {
      await registerPlayer(id, targetId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
