import { createClient } from "@/lib/supabase-server";
import { supabase as serviceClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { getAuthPlayer } from "@/lib/auth";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import NavigationLoader from "@/components/NavigationLoader";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let player = await getAuthPlayer();

  if (!player) {
    // Check if user is authenticated but has no player record
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/welcome");

    const name = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Player";

    // Claim a manually-created player with the same email, if one exists
    const { data: claimable } = user.email
      ? await serviceClient
          .from("oc_players")
          .select("id, name, is_admin")
          .eq("email", user.email)
          .is("user_id", null)
          .maybeSingle()
      : { data: null };

    if (claimable) {
      await serviceClient
        .from("oc_players")
        .update({ user_id: user.id })
        .eq("id", claimable.id);
      player = {
        id: claimable.id,
        name: claimable.name,
        email: user.email!,
        userId: user.id,
        isAdmin: claimable.is_admin ?? false,
      };
    } else {
      const { data: newPlayer } = await serviceClient
        .from("oc_players")
        .insert({ user_id: user.id, name, email: user.email ?? null, is_admin: false })
        .select("id, name, is_admin")
        .single();
      if (!newPlayer) redirect("/welcome");
      player = {
        id: newPlayer.id,
        name: newPlayer.name,
        email: user.email ?? "",
        userId: user.id,
        isAdmin: newPlayer.is_admin ?? false,
      };
    }
  }

  return (
    <NavigationLoader>
      <div className="flex flex-col min-h-screen bg-background">
        <Header userName={player.name ?? "Player"} isAdmin={player.isAdmin} />
        {/* pt-14 clears the fixed header, pb-16 clears the fixed bottom nav */}
        <main className="flex-1 pt-14 pb-16">
          {children}
        </main>
        <BottomNav isAdmin={player.isAdmin} />
        <ServiceWorkerRegistration />
      </div>
    </NavigationLoader>
  );
}
