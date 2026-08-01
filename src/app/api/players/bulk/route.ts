import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { bulkCreatePlayers } from "@/lib/db/players";

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json();
  const lines: string[] = Array.isArray(body.lines)
    ? body.lines
    : typeof body.text === "string"
      ? body.text.split("\n")
      : [];
  if (lines.length === 0) {
    return NextResponse.json({ error: "No names provided" }, { status: 400 });
  }
  try {
    const result = await bulkCreatePlayers(lines);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
