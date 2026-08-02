import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";
import { getEvent } from "@/lib/db/events";
import { deleteMatch, recordScore, resetScore } from "@/lib/db/matches";

async function matchEvent(matchId: string) {
  const { data } = await supabase.from("oc_matches").select("event_id").eq("id", matchId).maybeSingle();
  return data ? getEvent(data.event_id) : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();

  const event = await matchEvent(id);
  if (!event) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (event.stage !== "started") {
    return NextResponse.json({ error: "Start the tournament before entering scores" }, { status: 400 });
  }

  if (body.reset === true) {
    try {
      await resetScore(id);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

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
