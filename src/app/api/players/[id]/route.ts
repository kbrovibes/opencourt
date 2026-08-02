import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { updatePlayer } from "@/lib/db/players";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();

  if (body.name !== undefined && !String(body.name).trim()) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }
  if (body.skill_level !== undefined && body.skill_level !== null) {
    const s = parseInt(body.skill_level, 10);
    if (!Number.isFinite(s) || s < 1 || s > 5) {
      return NextResponse.json({ error: "Skill level must be 1–5" }, { status: 400 });
    }
    body.skill_level = s;
  }

  try {
    await updatePlayer(id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
