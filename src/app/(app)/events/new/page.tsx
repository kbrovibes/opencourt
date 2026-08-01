import { getAuthPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateEventForm from "./CreateEventForm";

export default async function NewEventPage() {
  const player = await getAuthPlayer();
  if (!player?.isAdmin) redirect("/");

  return (
    <div className="max-w-md mx-auto px-4 py-5">
      <h1 className="text-xl font-bold text-heading mb-4">Create Event</h1>
      <CreateEventForm />
    </div>
  );
}
