import { getAuthPlayer } from "@/lib/auth";
import { getPlayerStats } from "@/lib/db/stats";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import pkg from "../../../../package.json";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const player = await getAuthPlayer();
  if (!player) redirect("/welcome");

  const stats = await getPlayerStats(player.id);

  return (
    <ProfileClient
      stats={stats}
      name={player.name}
      email={player.email}
      isAdmin={player.isAdmin}
      version={pkg.version}
      skill={player.skillLevel}
    />
  );
}
