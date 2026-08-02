import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";

export async function PATCH(request: NextRequest) {
  const { player, response } = await requireAuth();
  if (response) return response;

  const body = await request.json();
  const fields: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    fields.name = name;
  }
  if (body.skill_level !== undefined) {
    const s = parseInt(body.skill_level, 10);
    if (!Number.isFinite(s) || s < 1 || s > 5) {
      return NextResponse.json({ error: "Skill level must be 1–5" }, { status: 400 });
    }
    fields.skill_level = s;
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase.from("oc_players").update(fields).eq("id", player.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
