"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OcMatch } from "@/lib/db/matches";
import type { EventStatus, EventType } from "@/lib/db/events";

interface PlayerOpt {
  id: string;
  name: string;
}

interface Props {
  eventId: string;
  eventType: EventType;
  eventStatus: EventStatus;
  isAdmin: boolean;
  matches: OcMatch[];
  players: PlayerOpt[]; // checked-in players, for match creation
  nameById: Record<string, string>;
}

const selectCls =
  "w-full px-2.5 py-2 bg-surface-alt border border-stone-300 dark:border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-sky-500";

function teamLabel(m: OcMatch, team: 1 | 2, nameById: Record<string, string>): string {
  const ids = team === 1 ? [m.team1_player1_id, m.team1_player2_id] : [m.team2_player1_id, m.team2_player2_id];
  return ids.filter(Boolean).map((id) => nameById[id!] ?? "?").join(" & ");
}

function ScoreEntry({ match, onDone }: { match: OcMatch; onDone: () => void }) {
  const [t1, setT1] = useState("");
  const [t2, setT2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team1_score: t1, team2_score: t2 }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed");
      setBusy(false);
      return;
    }
    setBusy(false);
    onDone();
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input type="number" min={0} placeholder="0" value={t1} onChange={(e) => setT1(e.target.value)}
        className="w-16 px-2 py-1.5 bg-surface-alt border border-stone-300 dark:border-border rounded-lg text-sm text-center text-text focus:outline-none focus:ring-2 focus:ring-sky-500" />
      <span className="text-xs text-muted">—</span>
      <input type="number" min={0} placeholder="0" value={t2} onChange={(e) => setT2(e.target.value)}
        className="w-16 px-2 py-1.5 bg-surface-alt border border-stone-300 dark:border-border rounded-lg text-sm text-center text-text focus:outline-none focus:ring-2 focus:ring-sky-500" />
      <button onClick={save} disabled={busy || t1 === "" || t2 === ""}
        className="ml-auto px-3 py-1.5 bg-stone-900 dark:bg-sky-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
        Save score
      </button>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
}

export default function MatchesSection({ eventId, eventType, eventStatus, isAdmin, matches, players, nameById }: Props) {
  const router = useRouter();
  const isDoubles = eventType === "doubles";
  const slots = isDoubles ? 4 : 2;
  const [sel, setSel] = useState<string[]>(Array(slots).fill(""));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const standings = useMemo(() => {
    const rows = new Map<string, { wins: number; losses: number }>();
    for (const m of matches) {
      if (m.status !== "completed" || !m.winning_team) continue;
      const t1Won = m.winning_team === 1;
      for (const [id, won] of [
        [m.team1_player1_id, t1Won], [m.team1_player2_id, t1Won],
        [m.team2_player1_id, !t1Won], [m.team2_player2_id, !t1Won],
      ] as [string | null, boolean][]) {
        if (!id) continue;
        const row = rows.get(id) ?? { wins: 0, losses: 0 };
        if (won) row.wins++; else row.losses++;
        rows.set(id, row);
      }
    }
    return [...rows.entries()]
      .map(([id, r]) => ({ id, name: nameById[id] ?? "?", ...r }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
  }, [matches, nameById]);

  async function createMatch() {
    setCreating(true);
    setError(null);
    const body: Record<string, string> = { event_id: eventId };
    body.team1_player1_id = sel[0];
    body.team2_player1_id = isDoubles ? sel[2] : sel[1];
    if (isDoubles) {
      body.team1_player2_id = sel[1];
      body.team2_player2_id = sel[3];
    }
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create match");
      setCreating(false);
      return;
    }
    setSel(Array(slots).fill(""));
    setCreating(false);
    setShowForm(false);
    router.refresh();
  }

  async function removeMatch(id: string) {
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const slotLabels = isDoubles
    ? ["Team 1 — Player 1", "Team 1 — Player 2", "Team 2 — Player 1", "Team 2 — Player 2"]
    : ["Player 1", "Player 2"];

  return (
    <section className="flex flex-col gap-4">
      {/* Standings */}
      {standings.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">Standings</h2>
          <div className="bg-surface rounded-xl border border-border-light dark:border-border divide-y divide-border-light dark:divide-border">
            {standings.map((s, i) => (
              <div key={s.id} className="flex items-center px-4 py-2">
                <span className="w-6 text-xs text-muted-light">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-heading">{s.name}</span>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{s.wins}W</span>
                <span className="text-sm text-muted ml-2">{s.losses}L</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light">
            Matches ({matches.length})
          </h2>
          {isAdmin && eventStatus === "live" && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400"
            >
              {showForm ? "Close" : "+ New match"}
            </button>
          )}
        </div>

        {/* Create match form */}
        {isAdmin && showForm && (
          <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3 mb-3 flex flex-col gap-2">
            {players.length < slots ? (
              <p className="text-sm text-muted">Need at least {slots} checked-in players.</p>
            ) : (
              <>
                {slotLabels.map((label, i) => (
                  <div key={label} className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-muted-light">{label}</label>
                    <select
                      value={sel[i]}
                      onChange={(e) => {
                        const next = [...sel];
                        next[i] = e.target.value;
                        setSel(next);
                      }}
                      className={selectCls}
                    >
                      <option value="">Select player…</option>
                      {players
                        .filter((p) => !sel.includes(p.id) || sel[i] === p.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </div>
                ))}
                <button
                  onClick={createMatch}
                  disabled={creating || sel.slice(0, slots).some((s) => !s)}
                  className="mt-1 w-full py-2.5 bg-stone-900 dark:bg-sky-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create match"}
                </button>
                {error && <p className="text-xs text-red-500">{error}</p>}
              </>
            )}
          </div>
        )}

        {matches.length === 0 ? (
          <p className="text-sm text-muted px-1">No matches yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {matches.map((m) => {
              const done = m.status === "completed";
              return (
                <div key={m.id} className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${done && m.winning_team === 1 ? "font-bold text-heading" : "text-text"}`}>
                        {teamLabel(m, 1, nameById)}
                        {done && <span className="ml-2 font-mono text-sm">{m.team1_score}</span>}
                      </p>
                      <p className="text-[10px] text-muted-lighter my-0.5">vs</p>
                      <p className={`text-sm truncate ${done && m.winning_team === 2 ? "font-bold text-heading" : "text-text"}`}>
                        {teamLabel(m, 2, nameById)}
                        {done && <span className="ml-2 font-mono text-sm">{m.team2_score}</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {done ? (
                        <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">Final</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">In progress</span>
                      )}
                      {isAdmin && (
                        <button onClick={() => removeMatch(m.id)} className="text-[11px] text-red-400 hover:text-red-500">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {isAdmin && !done && <ScoreEntry match={m} onDone={() => router.refresh()} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
