import { getAuthPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import pkg from "../../../../package.json";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const player = await getAuthPlayer();
  if (!player) redirect("/welcome");

  return (
    <ProfileClient
      name={player.name}
      email={player.email}
      isAdmin={player.isAdmin}
      version={pkg.version}
      skill={player.skillLevel}
    />
  );
}
