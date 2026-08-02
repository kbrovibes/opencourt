"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLoader } from "@/components/NavigationLoader";
import type { OcEvent, EventStatus } from "@/lib/db/events";

export default function EventAdminControls({ event }: { event: OcEvent }) {
  const router = useRouter();
  const { startLoading } = useNavigationLoader();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function setStatus(status: EventStatus) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update event");
    }
    setBusy(false);
    router.refresh();
  }

  async function deleteEvent() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete event");
      setBusy(false);
      return;
    }
    startLoading();
    router.push("/");
    router.refresh();
  }

  const btn = (label: string, status: EventStatus, style: string) => (
    <button
      key={status + label}
      onClick={() => setStatus(status)}
      disabled={busy}
      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${style}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {event.status === "draft" &&
          btn("🚀 Go Live", "live", "bg-green-600 text-white hover:bg-green-500")}
        {event.status === "live" && [
          btn("✅ Complete", "completed", "bg-stone-900 dark:bg-sky-600 text-white hover:bg-stone-800 dark:hover:bg-sky-500"),
          btn("↩︎ Back to Draft", "draft", "bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border"),
        ]}
        {(event.status === "completed" || event.status === "cancelled") &&
          btn("🔄 Reopen", "live", "bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border")}
        {event.status !== "cancelled" && event.status !== "completed" &&
          btn("Cancel", "cancelled", "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20")}
        <button
          onClick={deleteEvent}
          disabled={busy}
          className={`py-2 px-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            confirmDelete
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-surface-alt text-red-600 dark:text-red-400 hover:bg-border-light dark:hover:bg-border"
          }`}
          title="Delete event (recoverable from the database)"
        >
          {confirmDelete ? "Really delete?" : "🗑"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
