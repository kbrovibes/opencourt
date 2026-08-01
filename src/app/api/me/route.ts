import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";

export async function PATCH(request: NextRequest) {
  const { player, response } = await requireAuth();
  if (response) return response;

  const body = await request.json();
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const { error } = await supabase.from("oc_players").update({ name }).eq("id", player.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
