import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEvent, updateEvent, type MatchFormat } from "@/lib/db/events";
import { listTeams } from "@/lib/db/teams";
import { clearMatches, generateRoundRobin, generateSingleElim } from "@/lib/db/matches";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.stage !== "teams_locked") {
    return NextResponse.json({ error: "Lock teams before setting up matches" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const format = body.format as MatchFormat;
  if (!["manual", "single_elim", "round_robin"].includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  try {
    const teams = await listTeams(id);
    await clearMatches(id); // idempotent regeneration
    if (format === "single_elim") {
      await generateSingleElim(id, event.event_type, teams);
    } else if (format === "round_robin") {
      await generateRoundRobin(id, event.event_type, teams);
    }
    // manual: no matches generated — admin creates team-vs-team matches by hand
    await updateEvent(id, { stage: "matches_set", match_format: format });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
