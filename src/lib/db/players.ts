import { supabase } from "@/lib/supabase";

export interface Player {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  is_admin: boolean;
  skill_level: number | null;
  disabled: boolean;
  created_at: string;
}

const PLAYER_COLS = "id, user_id, name, email, is_admin, skill_level, disabled, created_at";

export async function listPlayers(includeDisabled = false): Promise<Player[]> {
  let query = supabase.from("oc_players").select(PLAYER_COLS).order("name");
  if (!includeDisabled) query = query.eq("disabled", false);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createPlayer(name: string, email?: string | null): Promise<Player> {
  const { data, error } = await supabase
    .from("oc_players")
    .insert({ name: name.trim(), email: email?.trim() || null })
    .select(PLAYER_COLS)
    .single();
  if (error) throw error;
  return data;
}

const EDITABLE_FIELDS = new Set(["name", "email", "skill_level", "is_admin", "disabled"]);

export async function updatePlayer(id: string, fields: Record<string, unknown>): Promise<void> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (EDITABLE_FIELDS.has(k)) clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return;
  const { error } = await supabase.from("oc_players").update(clean).eq("id", id);
  if (error) throw error;
}

/** Bulk create players from lines of "Name" or "Name, email". Skips names that already exist. */
export async function bulkCreatePlayers(lines: string[]): Promise<{ created: number; skipped: string[] }> {
  const parsed = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, email] = l.split(",").map((s) => s.trim());
      return { name, email: email || null };
    })
    .filter((p) => p.name);

  if (parsed.length === 0) return { created: 0, skipped: [] };

  const { data: existing } = await supabase
    .from("oc_players")
    .select("name");
  const existingNames = new Set((existing ?? []).map((p) => p.name.toLowerCase()));

  const fresh = parsed.filter((p) => !existingNames.has(p.name.toLowerCase()));
  const skipped = parsed.filter((p) => existingNames.has(p.name.toLowerCase())).map((p) => p.name);

  if (fresh.length > 0) {
    const { error } = await supabase.from("oc_players").insert(fresh);
    if (error) throw error;
  }
  return { created: fresh.length, skipped };
}
