"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PlayerTile {
  id: string;
  name: string;
}

interface Team {
  id: string;
  seed: number;
  label: string;
  playerIds: string[];
}

interface Props {
  eventId: string;
  eventType: "singles" | "doubles";
  checkedIn: PlayerTile[];
  teams: Team[]; // saved teams
}

export default function TeamFormationPanel({ eventId, eventType, checkedIn, teams }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<string[][]>([]); // local, unsaved lineups
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamSize = eventType === "doubles" ? 2 : 1;
  const nameOf = new Map(checkedIn.map((p) => [p.id, p.name]));
  const inSaved = new Set(teams.flatMap((t) => t.playerIds));
  const inPending = new Set(pending.flat());
  const free = checkedIn.filter((p) => !inSaved.has(p.id) && !inPending.has(p.id));

  async function api(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${eventId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      setBusy(false);
      return false;
    }
    setBusy(false);
    router.refresh();
    return true;
  }

  // Pure client-side: tap tiles to build lineups locally, nothing hits the server
  function tap(playerId: string) {
    setError(null);
    if (selected.includes(playerId)) {
      setSelected(selected.filter((s) => s !== playerId));
      return;
    }
    const next = [...selected, playerId];
    if (next.length === teamSize) {
      setPending([...pending, next]);
      setSelected([]);
    } else {
      setSelected(next);
    }
  }

  async function saveAll() {
    if (pending.length === 0) return;
    const ok = await api({ action: "create_bulk", teams: pending });
    if (ok) setPending([]);
  }

  return (
    <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-heading">Team formation</h2>
        <span className="text-[11px] text-muted-light">
          {eventType === "doubles" ? "Tap two players to form a team" : "Tap a player to add them"}
        </span>
      </div>

      {/* Free player tiles */}
      {free.length === 0 ? (
        <p className="text-sm text-muted">
          {checkedIn.length === 0 ? "Nobody is checked in yet." : "Everyone checked-in is on a team. 🎉"}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {free.map((p) => {
            const sel = selected.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => tap(p.id)}
                className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  sel
                    ? "bg-sky-600 text-white border-sky-600 scale-105 shadow-md"
                    : "bg-surface-alt text-heading border-border-light dark:border-border hover:border-sky-400"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Pending (unsaved) lineups */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Not saved yet ({pending.length})
          </span>
          {pending.map((t, i) => (
            <div key={t.join("+")} className="flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-700/40 rounded-lg">
              <span className="text-sm font-medium text-heading">
                {t.map((pid) => nameOf.get(pid) ?? "?").join(" & ")}
              </span>
              <button
                onClick={() => setPending(pending.filter((_, j) => j !== i))}
                className="text-red-500 dark:text-red-400 text-sm font-bold px-1.5"
                title="Remove lineup"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={saveAll}
            disabled={busy}
            className="mt-1 w-full py-2.5 bg-stone-900 dark:bg-sky-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Saving…" : `💾 Save ${pending.length} team${pending.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Saved teams */}
      {teams.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-light">
            Saved teams ({teams.length})
          </span>
          {teams.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-3 py-2 bg-surface-alt rounded-lg"
            >
              <span className="text-sm font-medium text-heading">
                <span className="text-muted-light font-mono text-xs mr-2">#{t.seed}</span>
                {t.label}
              </span>
              <button
                onClick={() => api({ action: "delete", team_id: t.id })}
                disabled={busy}
                className="text-red-500 dark:text-red-400 text-sm font-bold px-1.5 disabled:opacity-50"
                title="Dissolve team"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {eventType === "doubles" ? (
          <button
            onClick={() => api({ action: "from_pairs" })}
            disabled={busy}
            className="px-3 py-2 bg-surface-alt text-text rounded-lg text-xs font-semibold hover:bg-border-light dark:hover:bg-border disabled:opacity-50"
          >
            🤝 Use confirmed pairs
          </button>
        ) : (
          <button
            onClick={() => api({ action: "from_pairs" })}
            disabled={busy}
            className="px-3 py-2 bg-surface-alt text-text rounded-lg text-xs font-semibold hover:bg-border-light dark:hover:bg-border disabled:opacity-50"
          >
            ⚡ Add all checked-in
          </button>
        )}
        {teams.length > 0 && (
          <button
            onClick={() => api({ action: "clear" })}
            disabled={busy}
            className="px-3 py-2 text-red-500 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-surface-alt disabled:opacity-50"
          >
            Clear saved
          </button>
        )}
      </div>
      {pending.length > 0 && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          ⚠️ Save your lineups before finalizing — only saved teams count.
        </p>
      )}
    </div>
  );
}
