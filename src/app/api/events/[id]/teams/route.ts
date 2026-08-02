import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEvent, getRoster } from "@/lib/db/events";
import {
  clearTeams,
  createTeam,
  deleteTeam,
  teamsFromCheckedInSingles,
  teamsFromConfirmedPairs,
} from "@/lib/db/teams";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.stage === "matches_set" || event.stage === "started") {
    return NextResponse.json({ error: "Teams are locked — regenerate matches first" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    switch (body.action) {
      case "create": {
        const ids: string[] = body.player_ids ?? [];
        const expected = event.event_type === "doubles" ? 2 : 1;
        if (ids.length !== expected) {
          return NextResponse.json({ error: `A ${event.event_type} team needs ${expected} player(s)` }, { status: 400 });
        }
        // players must be checked in and not already in a team
        const roster = await getRoster(event);
        for (const pid of ids) {
          if (!roster.find((r) => r.player_id === pid)?.checked_in_at) {
            return NextResponse.json({ error: "All team members must be checked in" }, { status: 400 });
          }
        }
        const team = await createTeam(id, ids[0], ids[1] ?? null);
        return NextResponse.json({ team });
      }
      case "delete":
        if (!body.team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });
        await deleteTeam(body.team_id);
        return NextResponse.json({ ok: true });
      case "clear":
        await clearTeams(id);
        return NextResponse.json({ ok: true });
      case "from_pairs": {
        const created =
          event.event_type === "doubles"
            ? await teamsFromConfirmedPairs(event)
            : await teamsFromCheckedInSingles(event);
        return NextResponse.json({ created });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
