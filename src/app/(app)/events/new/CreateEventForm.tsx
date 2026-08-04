"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLoader } from "@/components/NavigationLoader";
import LocationPicker from "@/components/LocationPicker";
import { FORMAT_OPTIONS } from "@/lib/formats";

const inputCls =
  "w-full h-11 px-3.5 bg-surface border border-stone-300 dark:border-border rounded-lg text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-sky-500";
const labelCls = "text-xs font-semibold uppercase tracking-wide text-muted-light";

export default function CreateEventForm({ quickPicks }: { quickPicks: string[] }) {
  const router = useRouter();
  const { startLoading } = useNavigationLoader();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [eventType, setEventType] = useState<"singles" | "doubles">("doubles");
  const [maxPlayers, setMaxPlayers] = useState("32");
  const [status, setStatus] = useState<"draft" | "live">("live");
  const [matchFormat, setMatchFormat] = useState<string>("groups");
  const [checkinOpensAt, setCheckinOpensAt] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        event_date: date,
        start_time: startTime,
        event_type: eventType,
        max_players: maxPlayers,
        status,
        checkin_opens_at: checkinOpensAt ? new Date(checkinOpensAt).toISOString() : null,
        location,
        notes,
        match_format: matchFormat === "later" ? null : matchFormat,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setSaving(false);
      return;
    }
    startLoading();
    router.push(`/events/${data.event.id}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Event name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Saturday Doubles Night" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Start time</label>
          <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Format</label>
        <div className="flex h-11 items-stretch bg-surface-alt rounded-lg p-0.5">
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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Max players</label>
          <input type="number" min={2} max={500} className={inputCls} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Visibility</label>
          <div className="flex h-11 items-stretch bg-surface-alt rounded-lg p-0.5">
            {(["live", "draft"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                  status === s ? "bg-surface text-heading shadow-sm" : "text-text-light hover:text-text"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Tournament format</label>
        <select value={matchFormat} onChange={(e) => setMatchFormat(e.target.value)} className={inputCls}>
          {FORMAT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
          <option value="later">Choose later</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Check-in opens (optional)</label>
        <input type="datetime-local" className={inputCls} value={checkinOpensAt} onChange={(e) => setCheckinOpensAt(e.target.value)} />
        <p className="text-[11px] text-muted-light">Leave empty to allow check-in any time while the event is live.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Location (optional)</label>
        <LocationPicker value={location} onChange={setLocation} quickPicks={quickPicks} inputClassName={inputCls} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Notes (optional)</label>
        <textarea className={`${inputCls.replace("h-11 ", "")} py-2.5 min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bring your own shuttles…" />
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
        {saving ? "Creating…" : "Create Event"}
      </button>
    </form>
  );
}
