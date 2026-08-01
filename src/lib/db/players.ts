import { supabase } from "@/lib/supabase";

export interface Player {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  is_admin: boolean;
  created_at: string;
}

export async function listPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("oc_players")
    .select("id, user_id, name, email, is_admin, created_at")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createPlayer(name: string, email?: string | null): Promise<Player> {
  const { data, error } = await supabase
    .from("oc_players")
    .insert({ name: name.trim(), email: email?.trim() || null })
    .select("id, user_id, name, email, is_admin, created_at")
    .single();
  if (error) throw error;
  return data;
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
