import { supabase } from "@/lib/supabase";
import { titleCaseName } from "@/lib/format";

export type EventStatus = "draft" | "live" | "completed" | "cancelled";
export type EventType = "singles" | "doubles";
export type EventStage = "roster" | "team_formation" | "teams_locked" | "matches_set" | "started";
export type MatchFormat = "manual" | "single_elim" | "round_robin" | "fixed_rounds" | "groups";

export interface OcEvent {
  id: string;
  name: string;
  event_date: string;
  start_time: string | null;
  event_type: EventType;
  max_players: number;
  status: EventStatus;
  stage: EventStage;
  match_format: MatchFormat | null;
  checkin_opens_at: string | null;
  short_code: string;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  copied_from: string | null;
  created_at: string;
}

/** Legal stage transitions (admin-driven). */
export const STAGE_TRANSITIONS: Record<EventStage, EventStage[]> = {
  roster: ["team_formation"],
  team_formation: ["roster", "teams_locked"],
  teams_locked: ["team_formation", "matches_set"],
  matches_set: ["teams_locked", "team_formation", "started"],
  started: ["matches_set"],
};

export interface RosterEntry {
  id: string;               // oc_event_players row id
  player_id: string;
  name: string;
  verified: boolean;        // has a real login (google/auth)
  registered_at: string;
  checked_in_at: string | null;
  partner_id: string | null;
  waitlisted: boolean;      // computed: registration order beyond max_players
}

const EVENT_COLS =
  "id, name, event_date, start_time, event_type, max_players, status, stage, match_format, checkin_opens_at, short_code, location, notes, created_by, copied_from, created_at";

// Unambiguous alphabet for short codes (no 0/O, 1/I/L)
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export async function listEvents(includeDrafts: boolean): Promise<OcEvent[]> {
  let query = supabase
    .from("oc_events")
    .select(EVENT_COLS)
    .is("deleted_at", null)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (!includeDrafts) {
    query = query.neq("status", "draft");
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getEvent(id: string): Promise<OcEvent | null> {
  const { data } = await supabase
    .from("oc_events")
    .select(EVENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
}

export async function getEventByCode(code: string): Promise<OcEvent | null> {
  const { data } = await supabase
    .from("oc_events")
    .select(EVENT_COLS)
    .ilike("short_code", code)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
}

export interface CreateEventInput {
  name: string;
  event_date: string;
  start_time?: string | null;
  event_type: EventType;
  max_players: number;
  status: "draft" | "live";
  checkin_opens_at?: string | null;
  location?: string | null;
  notes?: string | null;
  created_by: string;
  copied_from?: string | null;
  match_format?: MatchFormat | null;
}

export async function createEvent(input: CreateEventInput): Promise<OcEvent> {
  // Retry on the (unlikely) short-code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("oc_events")
      .insert({ ...input, short_code: randomCode() })
      .select(EVENT_COLS)
      .single();
    if (!error) return data;
    if (!error.message.includes("short_code")) throw error;
  }
  throw new Error("Could not generate a unique short code");
}

export async function updateEvent(
  id: string,
  fields: Partial<Omit<OcEvent, "id" | "short_code" | "created_at" | "created_by">>
): Promise<void> {
  const { error } = await supabase.from("oc_events").update(fields).eq("id", id);
  if (error) throw error;
}

/** Most recently used distinct venue strings (for quick-pick badges). */
export async function getRecentLocations(limit = 3): Promise<string[]> {
  const { data } = await supabase
    .from("oc_events")
    .select("location, created_at")
    .not("location", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(30);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data ?? []) {
    const loc = (row.location ?? "").trim();
    if (loc && !seen.has(loc)) {
      seen.add(loc);
      out.push(loc);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Soft delete: hides the event everywhere; recoverable by clearing deleted_at in the DB. */
export async function softDeleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from("oc_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Roster with computed waitlist flags: active registrations beyond max_players, by registration order. */
export async function getRoster(event: OcEvent): Promise<RosterEntry[]> {
  const { data, error } = await supabase
    .from("oc_event_players")
    .select("id, player_id, registered_at, checked_in_at, withdrawn_at, partner_id, oc_players!oc_event_players_player_id_fkey(name, user_id)")
    .eq("event_id", event.id)
    .is("withdrawn_at", null)
    .order("registered_at");
  if (error) throw error;

  return (data ?? []).map((row, idx) => {
    const playerRel = row.oc_players as unknown as { name: string; user_id: string | null } | { name: string; user_id: string | null }[] | null;
    const rel = Array.isArray(playerRel) ? playerRel[0] : playerRel;
    return {
      id: row.id,
      player_id: row.player_id,
      name: titleCaseName(rel?.name ?? "?"),
      verified: !!rel?.user_id,
      registered_at: row.registered_at,
      checked_in_at: row.checked_in_at,
      partner_id: row.partner_id,
      waitlisted: idx >= event.max_players,
    };
  });
}

export async function registerPlayer(eventId: string, playerId: string): Promise<void> {
  // Re-activate a withdrawn registration if present, else insert
  const { data: existing } = await supabase
    .from("oc_event_players")
    .select("id, withdrawn_at")
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) {
    if (existing.withdrawn_at) {
      const { error } = await supabase
        .from("oc_event_players")
        .update({ withdrawn_at: null, registered_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    }
    return;
  }

  const { error } = await supabase
    .from("oc_event_players")
    .insert({ event_id: eventId, player_id: playerId });
  if (error) throw error;
}

export async function withdrawPlayer(eventId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from("oc_event_players")
    .update({ withdrawn_at: new Date().toISOString(), checked_in_at: null, partner_id: null })
    .eq("event_id", eventId)
    .eq("player_id", playerId);
  if (error) throw error;
  // Clear any partner selections pointing at the withdrawn player
  await supabase
    .from("oc_event_players")
    .update({ partner_id: null })
    .eq("event_id", eventId)
    .eq("partner_id", playerId);
}

export async function setCheckedIn(eventId: string, playerId: string, checkedIn: boolean): Promise<void> {
  // Registers on the fly if needed (admin manual check-in of an unregistered player)
  await registerPlayer(eventId, playerId);
  const fields = checkedIn
    ? { checked_in_at: new Date().toISOString() }
    : { checked_in_at: null, partner_id: null };
  const { error } = await supabase
    .from("oc_event_players")
    .update(fields)
    .eq("event_id", eventId)
    .eq("player_id", playerId);
  if (error) throw error;
  if (!checkedIn) {
    // Clear partner selections pointing at a player who un-checked-in
    await supabase
      .from("oc_event_players")
      .update({ partner_id: null })
      .eq("event_id", eventId)
      .eq("partner_id", playerId);
  }
}

export async function setPartner(eventId: string, playerId: string, partnerId: string | null): Promise<void> {
  const { error } = await supabase
    .from("oc_event_players")
    .update({ partner_id: partnerId })
    .eq("event_id", eventId)
    .eq("player_id", playerId);
  if (error) throw error;
}

/** Live events this player is actively part of (registered or checked in). */
export async function getMyLiveEvents(playerId: string): Promise<OcEvent[]> {
  const { data } = await supabase
    .from("oc_event_players")
    .select(`checked_in_at, oc_events!inner(${EVENT_COLS})`)
    .eq("player_id", playerId)
    .is("withdrawn_at", null)
    .eq("oc_events.status", "live")
    .is("oc_events.deleted_at", null);
  return ((data ?? []) as unknown as { oc_events: OcEvent }[]).map((r) => r.oc_events);
}

/** Today's date in the club timezone (IST). */
export function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * The live event this player is currently checked into, preferring today's date.
 * Powers the "Today" bottom-nav shortcut.
 */
export async function getMyCheckedInLiveEventId(playerId: string): Promise<string | null> {
  const { data } = await supabase
    .from("oc_event_players")
    .select("event_id, oc_events!inner(id, status, event_date)")
    .eq("player_id", playerId)
    .not("checked_in_at", "is", null)
    .is("withdrawn_at", null)
    .eq("oc_events.status", "live")
    .is("oc_events.deleted_at", null);
  if (!data || data.length === 0) return null;
  // "Today" in IST (club timezone)
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const rows = data as unknown as { event_id: string; oc_events: { event_date: string } }[];
  const todayRow = rows.find((r) => r.oc_events.event_date === today);
  return (todayRow ?? rows[0]).event_id;
}

/** Check-in window: event must be live, and past checkin_opens_at when set. */
export function checkinOpen(event: OcEvent): boolean {
  if (event.status !== "live") return false;
  if (!event.checkin_opens_at) return true;
  return new Date(event.checkin_opens_at).getTime() <= Date.now();
}
