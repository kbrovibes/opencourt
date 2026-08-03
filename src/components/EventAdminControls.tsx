"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLoader } from "@/components/NavigationLoader";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { OcEvent, EventStatus } from "@/lib/db/events";

type PendingAction = "draft" | "cancel" | null;

export default function EventAdminControls({ event }: { event: OcEvent }) {
  const router = useRouter();
  const { startLoading } = useNavigationLoader();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);

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
    setPending(null);
    router.refresh();
  }

  async function copyToNew() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}/copy`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to copy event");
      setBusy(false);
      return;
    }
    startLoading();
    router.push(`/events/${data.event.id}`);
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

  const btn = (label: string, onClick: () => void, style: string, key?: string) => (
    <button
      key={key ?? label}
      onClick={onClick}
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
          btn("🚀 Go Live", () => setStatus("live"), "bg-green-600 text-white hover:bg-green-500")}
        {event.status === "live" && [
          btn("✅ Complete", () => setStatus("completed"), "bg-stone-900 dark:bg-sky-600 text-white hover:bg-stone-800 dark:hover:bg-sky-500", "complete"),
          btn("↩︎ Back to Draft", () => setPending("draft"), "bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border", "todraft"),
        ]}
        {(event.status === "completed" || event.status === "cancelled") &&
          btn("🔄 Reopen", () => setStatus("live"), "bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border")}
        {event.status !== "cancelled" && event.status !== "completed" &&
          btn("Cancel", () => setPending("cancel"), "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20")}
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
      <div className="flex gap-2">
        {btn("⧉ Copy to New", copyToNew, "bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border")}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <ConfirmDialog
        open={pending === "draft"}
        title="Back to draft?"
        message="The event will disappear for players until you go live again. Registrations and check-ins are kept."
        confirmLabel="Back to draft"
        busy={busy}
        onConfirm={() => setStatus("draft")}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === "cancel"}
        title="Cancel this event?"
        message="Players will see it as cancelled. You can reopen it later if plans change."
        confirmLabel="Cancel event"
        danger
        busy={busy}
        onConfirm={() => setStatus("cancelled")}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
