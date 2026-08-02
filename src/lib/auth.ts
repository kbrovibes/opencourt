import { cache } from "react";
import { createClient } from "@/lib/supabase-server";
import { supabase as serviceClient } from "@/lib/supabase";

export interface AuthPlayer {
  id: string;
  name: string;
  email: string;
  userId: string;
  isAdmin: boolean;
  skillLevel: number | null;
}

// Warm-instance TTL cache for the everyone_admin flag — saves a DB round-trip
// on nearly every request. 30s staleness is acceptable for a kill switch.
let eaCache: { value: boolean; expires: number } | null = null;
const EA_TTL_MS = 30_000;

/**
 * Returns true when the "everyone is admin" kill-switch is on.
 * Stored in oc_settings so it can be flipped without a redeploy.
 */
export const isEveryoneAdmin = cache(async (): Promise<boolean> => {
  if (eaCache && eaCache.expires > Date.now()) return eaCache.value;
  const { data } = await serviceClient
    .from("oc_settings")
    .select("value")
    .eq("key", "everyone_admin")
    .maybeSingle();
  const value = data?.value === true || data?.value === "true";
  eaCache = { value, expires: Date.now() + EA_TTL_MS };
  return value;
});

/**
 * Returns the current authenticated player. Cached per request via React.cache —
 * multiple server components calling this in the same render share one DB round-trip.
 */
export const getAuthPlayer = cache(async (): Promise<AuthPlayer | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: player }, everyoneAdmin] = await Promise.all([
    serviceClient
      .from("oc_players")
      .select("id, name, email, is_admin, skill_level, disabled")
      .eq("user_id", user.id)
      .maybeSingle(),
    isEveryoneAdmin(),
  ]);

  if (!player) return null;

  return {
    id: player.id,
    name: player.name,
    email: player.email ?? user.email ?? "",
    userId: user.id,
    isAdmin: everyoneAdmin || (player.is_admin ?? false),
    skillLevel: player.skill_level ?? null,
  };
});
