import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEvent, updateEvent, STAGE_TRANSITIONS, type EventStage } from "@/lib/db/events";
import { listTeams } from "@/lib/db/teams";
import { clearMatches } from "@/lib/db/matches";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const target = body.stage as EventStage;

  if (!STAGE_TRANSITIONS[event.stage]?.includes(target)) {
    return NextResponse.json(
      { error: `Cannot move from ${event.stage} to ${target}` },
      { status: 400 }
    );
  }

  // Guards
  if (target === "teams_locked") {
    const teams = await listTeams(id);
    if (teams.length < 2) {
      return NextResponse.json({ error: "Form at least 2 teams first" }, { status: 400 });
    }
  }

  try {
    // Stepping back from matches_set discards generated matches
    if (event.stage === "matches_set" && target === "teams_locked") {
      await clearMatches(id);
      await updateEvent(id, { stage: target, match_format: null });
    } else {
      await updateEvent(id, { stage: target });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
