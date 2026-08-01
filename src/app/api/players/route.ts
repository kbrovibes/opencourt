import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/api-auth";
import { createPlayer, listPlayers } from "@/lib/db/players";

export async function GET() {
  const { response } = await requireAuth();
  if (response) return response;
  try {
    const players = await listPlayers();
    return NextResponse.json({ players });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  try {
    const player = await createPlayer(body.name, body.email);
    return NextResponse.json({ player });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
