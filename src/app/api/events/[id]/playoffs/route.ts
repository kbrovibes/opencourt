import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEvent } from "@/lib/db/events";
import { listTeams } from "@/lib/db/teams";
import { computeTeamStandings, generateGroupKnockout, generatePlayoffs, listMatches } from "@/lib/db/matches";

/** Append knockout playoffs (top 2 or top 4 by standings) to a running group-format event. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.stage !== "started") {
    return NextResponse.json({ error: "Start the tournament first" }, { status: 400 });
  }
  if (event.match_format === "single_elim") {
    return NextResponse.json({ error: "Knockout events already have playoffs built in" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const size = body.size === 4 ? 4 : 2;
  const finalsBestOf = [1, 3, 5].includes(parseInt(body.best_of, 10)) ? parseInt(body.best_of, 10) : 1;

  try {
    const [teams, matches] = await Promise.all([listTeams(id), listMatches(id)]);
    if (matches.some((m) => m.bracket_pos !== null)) {
      return NextResponse.json({ error: "Playoffs already generated" }, { status: 400 });
    }
    const pendingGroup = matches.filter((m) => m.status !== "completed");
    if (pendingGroup.length > 0) {
      return NextResponse.json(
        { error: `Finish the ${pendingGroup.length} remaining group match(es) first` },
        { status: 400 }
      );
    }
    if (event.match_format === "groups") {
      await generateGroupKnockout(id, event.event_type, teams, matches, finalsBestOf);
    } else {
      const standings = computeTeamStandings(matches);
      await generatePlayoffs(id, event.event_type, teams, standings.map((s) => s.teamId), size, finalsBestOf);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
