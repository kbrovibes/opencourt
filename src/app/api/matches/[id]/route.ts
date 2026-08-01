import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { deleteMatch, recordScore } from "@/lib/db/matches";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const t1 = parseInt(body.team1_score, 10);
  const t2 = parseInt(body.team2_score, 10);
  if (!Number.isFinite(t1) || !Number.isFinite(t2) || t1 < 0 || t2 < 0) {
    return NextResponse.json({ error: "Scores must be non-negative numbers" }, { status: 400 });
  }
  if (t1 === t2) {
    return NextResponse.json({ error: "Scores cannot be tied" }, { status: 400 });
  }

  try {
    await recordScore(id, t1, t2);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  try {
    await deleteMatch(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
