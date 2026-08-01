import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import pkg from "../../../../package.json";

export async function GET() {
  const { error } = await supabase.from("oc_settings").select("key").limit(1);
  const { data: ea, error: eaErr } = await supabase
    .from("oc_settings")
    .select("value")
    .eq("key", "everyone_admin")
    .maybeSingle();
  return NextResponse.json({
    ok: !error,
    version: pkg.version,
    db: error ? error.message : "connected",
    debug_ea: { value: ea?.value, type: typeof ea?.value, err: eaErr?.message ?? null },
  });
}
