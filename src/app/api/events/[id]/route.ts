import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEvent, updateEvent } from "@/lib/db/events";

const EDITABLE = new Set([
  "name", "event_date", "start_time", "event_type", "max_players",
  "status", "checkin_opens_at", "location", "notes",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = await request.json();
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (EDITABLE.has(k)) fields[k] = v;
  }
  if (fields.status && !["draft", "live", "completed", "cancelled"].includes(fields.status as string)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    await updateEvent(id, fields);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
