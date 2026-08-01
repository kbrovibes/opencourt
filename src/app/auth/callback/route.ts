import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { supabase as serviceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  // Only allow internal redirects
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Ensure an oc_players record exists for this user
      const { data: existingPlayer } = await serviceClient
        .from("oc_players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingPlayer) {
        // Claim a manually-created player with the same email, if one exists
        const { data: claimable } = user.email
          ? await serviceClient
              .from("oc_players")
              .select("id")
              .eq("email", user.email)
              .is("user_id", null)
              .maybeSingle()
          : { data: null };

        if (claimable) {
          await serviceClient
            .from("oc_players")
            .update({ user_id: user.id })
            .eq("id", claimable.id);
        } else {
          await serviceClient.from("oc_players").insert({
            user_id: user.id,
            name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Player",
            email: user.email ?? null,
            is_admin: false,
          });
        }
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
}
