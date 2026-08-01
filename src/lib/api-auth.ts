import { NextResponse } from "next/server";
import { getAuthPlayer, type AuthPlayer } from "@/lib/auth";

type Guarded =
  | { player: AuthPlayer; response: null }
  | { player: null; response: NextResponse };

export async function requireAuth(): Promise<Guarded> {
  const player = await getAuthPlayer();
  if (!player) {
    return { player: null, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  return { player, response: null };
}

export async function requireAdmin(): Promise<Guarded> {
  const guarded = await requireAuth();
  if (guarded.response) return guarded;
  if (!guarded.player.isAdmin) {
    return { player: null, response: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return guarded;
}
