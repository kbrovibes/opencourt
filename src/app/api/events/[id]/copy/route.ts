import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createEvent, getEvent } from "@/lib/db/events";
import { supabase } from "@/lib/supabase";

/** Copy an event into a fresh draft dated today (IST). Links back via copied_from. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { player, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const source = await getEvent(id);
  if (!source) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const pretty = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Kolkata" });
  // Strip previous copy suffixes ("- Mon D" and/or "- N") so copies don't chain
  const baseName = source.name
    .replace(/ - \d+$/, "")
    .replace(/ - [A-Z][a-z]{2} \d{1,2}$/, "");

  // Unique name: "Base - Mon D", then "Base - Mon D - 1", "- 2", … (checks all
  // events incl. soft-deleted so a restore never collides)
  const candidate = `${baseName} - ${pretty}`;
  const { data: existing } = await supabase
    .from("oc_events")
    .select("name")
    .ilike("name", `${candidate}%`);
  const taken = new Set((existing ?? []).map((e) => e.name));
  let name = candidate;
  for (let i = 1; taken.has(name); i++) {
    name = `${candidate} - ${i}`;
  }

  try {
    const event = await createEvent({
      name,
      event_date: today,
      start_time: source.start_time,
      event_type: source.event_type,
      max_players: source.max_players,
      status: "draft",
      checkin_opens_at: null,
      location: source.location,
      notes: source.notes,
      created_by: player.id,
      copied_from: source.id,
    });
    return NextResponse.json({ event });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
