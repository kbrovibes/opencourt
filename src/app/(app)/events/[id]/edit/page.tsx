import { notFound, redirect } from "next/navigation";
import { getAuthPlayer } from "@/lib/auth";
import { getEvent } from "@/lib/db/events";
import BackButton from "@/components/BackButton";
import EditEventForm from "./EditEventForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getAuthPlayer();
  if (!player?.isAdmin) redirect("/");

  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-4">
      <BackButton href={`/events/${id}`} label="Back to event" />
      <h1 className="text-xl font-bold text-heading">Edit Event</h1>
      <EditEventForm event={event} />
    </div>
  );
}
