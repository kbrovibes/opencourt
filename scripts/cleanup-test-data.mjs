#!/usr/bin/env node
// Deletes the overnight validation test data (test events, test players, test auth users).
// Run: node scripts/cleanup-test-data.mjs   (needs .env.local values inline below)
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "https://zwwkcwdqsplztlmyfpyf.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY (see .env.local)");
  process.exit(1);
}
const c = createClient(url, key);

const TEST_EMAILS = [
  "oc-test-admin@opencourt.test",
  "oc-test-arya@opencourt.test",
  "oc-test-bala@opencourt.test",
];
const TEST_PLAYER_NAMES = ["Manual Mo", "Priya Test", "Ravi Test"];
const TEST_EVENT_NAMES = ["Saturday Doubles Bash", "Singles Showdown"];

// Events (cascades to oc_event_players + oc_matches)
const { data: events } = await c.from("oc_events").select("id, name").in("name", TEST_EVENT_NAMES);
for (const e of events ?? []) {
  await c.from("oc_events").delete().eq("id", e.id);
  console.log("deleted event:", e.name);
}

// Players
const { data: players } = await c
  .from("oc_players")
  .select("id, name, email, user_id")
  .or(`email.in.(${TEST_EMAILS.join(",")}),name.in.(${TEST_PLAYER_NAMES.map((n) => `"${n}"`).join(",")})`);
for (const p of players ?? []) {
  await c.from("oc_players").delete().eq("id", p.id);
  console.log("deleted player:", p.name);
  if (p.user_id) {
    await c.auth.admin.deleteUser(p.user_id);
    console.log("deleted auth user for:", p.name);
  }
}

console.log("done");
