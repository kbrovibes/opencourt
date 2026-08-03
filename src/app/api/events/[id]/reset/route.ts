import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEvent, updateEvent } from "@/lib/db/events";
import { clearMatches, resetAllScores } from "@/lib/db/matches";

/**
 * mode "scores": wipe every score back to pending; bracket progression is rewound
 *   (advanced winners cleared from later rounds, bye seeds retained).
 * mode "event": delete matches and return to teams_locked — roster, check-ins
 *   and teams are all retained. Completed events come back live.
 */
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
  const mode = body.mode as "scores" | "event";

  try {
    if (mode === "scores") {
      await resetAllScores(id);
    } else if (mode === "event") {
      await clearMatches(id);
      await updateEvent(id, {
        stage: "teams_locked",
        match_format: null,
        ...(event.status === "completed" ? { status: "live" } : {}),
      });
    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
