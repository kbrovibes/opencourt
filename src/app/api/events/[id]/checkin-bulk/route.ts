import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEvent, setCheckedIn } from "@/lib/db/events";

/** Admin bulk check-in (registers players on the fly). Used by the copy-check-ins widget. */
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
  const ids: string[] = Array.isArray(body.player_ids) ? body.player_ids : [];
  if (ids.length === 0) return NextResponse.json({ error: "No players selected" }, { status: 400 });

  try {
    for (const pid of ids) {
      await setCheckedIn(id, pid, true);
    }
    return NextResponse.json({ checkedIn: ids.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
