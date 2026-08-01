import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Public routes — always accessible
  if (
    pathname.startsWith("/auth") ||
    pathname === "/login" ||
    pathname === "/welcome" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/api/health")
  ) {
    return response;
  }

  // All other routes require login. Short links (/e/CODE) preserve their
  // destination so the user lands back on the event after signing in.
  if (!user) {
    const welcome = new URL("/welcome", request.url);
    if (pathname.startsWith("/e/")) {
      welcome.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(welcome);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp|woff2?)).*)"],
};
