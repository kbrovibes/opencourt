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
  teams: Team[];
}

export default function TeamFormationPanel({ eventId, eventType, checkedIn, teams }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamSize = eventType === "doubles" ? 2 : 1;
  const inTeam = new Set(teams.flatMap((t) => t.playerIds));
  const free = checkedIn.filter((p) => !inTeam.has(p.id));

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
    }
    setBusy(false);
    router.refresh();
  }

  async function tap(playerId: string) {
    if (busy) return;
    if (selected.includes(playerId)) {
      setSelected(selected.filter((s) => s !== playerId));
      return;
    }
    const next = [...selected, playerId];
    if (next.length === teamSize) {
      setSelected([]);
      await api({ action: "create", player_ids: next });
    } else {
      setSelected(next);
    }
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
                disabled={busy}
                className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${
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

      {/* Formed teams */}
      {teams.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-light">
            Teams ({teams.length})
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
        {eventType === "doubles" && (
          <button
            onClick={() => api({ action: "from_pairs" })}
            disabled={busy}
            className="px-3 py-2 bg-surface-alt text-text rounded-lg text-xs font-semibold hover:bg-border-light dark:hover:bg-border disabled:opacity-50"
          >
            🤝 Use confirmed pairs
          </button>
        )}
        {eventType === "singles" && (
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
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
