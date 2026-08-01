import { getAuthPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const player = await getAuthPlayer();
  if (!player?.isAdmin) redirect("/");

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-heading">Users</h1>
      <p className="text-sm text-muted mt-2">Coming soon.</p>
    </div>
  );
}
