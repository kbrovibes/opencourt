import { NextResponse, type NextRequest } from "next/server";
import { getEventByCode } from "@/lib/db/events";

/** Tiny URL: /e/AB12CD → event detail page. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const event = await getEventByCode(code);
  if (!event) {
    return NextResponse.redirect(new URL("/?missing=1", request.url));
  }
  return NextResponse.redirect(new URL(`/events/${event.id}`, request.url));
}
