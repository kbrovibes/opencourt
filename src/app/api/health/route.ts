import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import pkg from "../../../../package.json";

export async function GET() {
  const { error } = await supabase.from("oc_settings").select("key").limit(1);
  return NextResponse.json({
    ok: !error,
    version: pkg.version,
    db: error ? error.message : "connected",
  });
}
