"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLoader } from "@/components/NavigationLoader";
import type { OcEvent } from "@/lib/db/events";

const inputCls =
  "w-full px-3.5 py-2.5 bg-surface border border-stone-300 dark:border-border rounded-lg text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-sky-500";
const labelCls = "text-xs font-semibold uppercase tracking-wide text-muted-light";

function toLocalDatetime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventForm({ event }: { event: OcEvent }) {
  const router = useRouter();
  const { startLoading } = useNavigationLoader();
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.event_date);
  const [startTime, setStartTime] = useState(event.start_time ?? "");
  const [eventType, setEventType] = useState(event.event_type);
  const [maxPlayers, setMaxPlayers] = useState(String(event.max_players));
  const [checkinOpensAt, setCheckinOpensAt] = useState(toLocalDatetime(event.checkin_opens_at));
  const [location, setLocation] = useState(event.location ?? "");
  const [notes, setNotes] = useState(event.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLocked = event.stage !== "roster"; // teams may exist beyond roster stage

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        event_date: date,
        start_time: startTime.trim() || null,
        ...(typeLocked ? {} : { event_type: eventType }),
        max_players: parseInt(maxPlayers, 10),
        checkin_opens_at: checkinOpensAt ? new Date(checkinOpensAt).toISOString() : null,
        location: location.trim() || null,
        notes: notes.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setSaving(false);
      return;
    }
    startLoading();
    router.push(`/events/${event.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Event name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Start time</label>
          <input className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="6:00 PM" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Format {typeLocked && <span className="normal-case text-muted-lighter">(locked after team formation)</span>}</label>
        <div className={`flex bg-surface-alt rounded-lg p-0.5 ${typeLocked ? "opacity-50 pointer-events-none" : ""}`}>
          {(["doubles", "singles"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEventType(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                eventType === t ? "bg-surface text-heading shadow-sm" : "text-text-light hover:text-text"
              }`}
            >
              {t === "doubles" ? "🤝 Doubles" : "🏸 Singles"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Max players</label>
        <input type="number" min={2} max={500} className={inputCls} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Check-in opens (optional)</label>
        <input type="datetime-local" className={inputCls} value={checkinOpensAt} onChange={(e) => setCheckinOpensAt(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Location (optional)</label>
        <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Notes (optional)</label>
        <textarea className={`${inputCls} min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-stone-900 dark:bg-sky-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-stone-800 dark:hover:bg-sky-500 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
