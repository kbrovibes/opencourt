"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SourcePlayer {
  id: string;
  name: string;
}

interface Props {
  eventId: string;
  sourceName: string;
  players: SourcePlayer[]; // source-event roster not yet checked in here
}

/** Folded widget on copied events: tap the old crew's names, bulk check-in. */
export default function CopyCheckins({ eventId, sourceName, players }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (players.length === 0) return null;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function checkInSelected() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${eventId}/checkin-bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_ids: [...selected] }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    setSelected(new Set());
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="bg-surface rounded-xl border border-border-light dark:border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-alt transition-colors"
      >
        <span className="text-sm font-semibold text-heading">
          ⧉ Check in players from “{sourceName}”
        </span>
        <span className="text-xs text-muted-light">{open ? "▲" : `${players.length} ▼`}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border-light dark:border-border pt-3">
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const sel = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  disabled={busy}
                  className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${
                    sel
                      ? "bg-green-600 text-white border-green-600 scale-105 shadow-md"
                      : "bg-surface-alt text-heading border-border-light dark:border-border hover:border-green-400"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(selected.size === players.length ? new Set() : new Set(players.map((p) => p.id)))}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400"
            >
              {selected.size === players.length ? "Clear all" : "Select all"}
            </button>
            <button
              onClick={checkInSelected}
              disabled={busy || selected.size === 0}
              className="ml-auto px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              {busy ? "Checking in…" : `✓ Check in (${selected.size})`}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
