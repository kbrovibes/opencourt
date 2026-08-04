"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLoader } from "@/components/NavigationLoader";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { OcEvent, EventStatus } from "@/lib/db/events";

type PendingAction = "draft" | "cancel" | "complete" | null;

export default function EventAdminControls({ event, canUnstart, canStart, pendingMatches }: { event: OcEvent; canUnstart: boolean; canStart: boolean; pendingMatches: number }) {
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

  async function setStage(stage: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed");
    }
    setBusy(false);
    router.refresh();
  }

  async function unstart() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "matches_set" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to un-start");
    }
    setBusy(false);
    router.refresh();
  }

  const btn = (label: string, onClick: () => void, style: string, key?: string) => (
    <button
      key={key ?? label}
      onClick={onClick}
      disabled={busy}
      className={`py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${style}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Uniform grid — every action the same width */}
      <div className="grid grid-cols-3 gap-1.5">
        {event.status === "draft" &&
          btn("Go Live", () => setStatus("live"), "bg-green-600 text-white hover:bg-green-500")}
        {event.status === "live" && [
          btn("Complete", () => setPending("complete"), "bg-green-600 text-white hover:bg-green-500", "complete"),
          ...(canStart
            ? [btn("Start", () => setStage("started"), "bg-sky-600 text-white hover:bg-sky-500", "start")]
            : []),
          btn("To Draft", () => setPending("draft"), "bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border", "todraft"),
        ]}
        {(event.status === "completed" || event.status === "cancelled") &&
          btn("Reopen", () => setStatus("live"), "bg-amber-600 text-white hover:bg-amber-500")}
        {event.status !== "cancelled" && event.status !== "completed" &&
          btn("Cancel", () => setPending("cancel"), "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20")}
        {btn("Copy to New", copyToNew, "bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border")}
        {canUnstart &&
          btn("Un-start", unstart, "bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border")}
        <button
          onClick={deleteEvent}
          disabled={busy}
          className={`py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
            confirmDelete
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-surface-alt text-red-600 dark:text-red-400 hover:bg-border-light dark:hover:bg-border"
          }`}
          title="Delete event (recoverable from the database)"
        >
          {confirmDelete ? "Really?" : "Delete"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <ConfirmDialog
        open={pending === "complete"}
        title="Complete this event?"
        message={
          pendingMatches > 0
            ? `${pendingMatches} match${pendingMatches > 1 ? "es are" : " is"} still unfinished. Completing closes the event and shows the final summary.`
            : "All matches are done. Completing closes the event and shows the final summary."
        }
        confirmLabel="Complete event"
        busy={busy}
        onConfirm={() => setStatus("completed")}
        onClose={() => setPending(null)}
      />
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
