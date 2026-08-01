import { getAuthPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const player = await getAuthPlayer();
  if (!player) redirect("/welcome");

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-heading">Profile</h1>
      <p className="text-sm text-muted mt-2">{player.name}</p>
    </div>
  );
}
