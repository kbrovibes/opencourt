"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OcMatch } from "@/lib/db/matches";
import type { EventStage, MatchFormat } from "@/lib/db/events";

interface TeamOpt {
  id: string;
  label: string;
}

interface Props {
  eventId: string;
  stage: EventStage;
  eventCompleted: boolean;
  matchFormat: MatchFormat | null;
  isAdmin: boolean;
  matches: OcMatch[];
  teams: TeamOpt[];
}

const selectCls =
  "w-full px-2.5 py-2 bg-surface-alt border border-stone-300 dark:border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-sky-500";



function ScoreEntry({ match, onDone }: { match: OcMatch; onDone: () => void }) {
  const [t1, setT1] = useState(match.team1_score !== null ? String(match.team1_score) : "");
  const [t2, setT2] = useState(match.team2_score !== null ? String(match.team2_score) : "");
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

export default function MatchesSection({ eventId, stage, eventCompleted, matchFormat, isAdmin, matches, teams }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [sel1, setSel1] = useState("");
  const [sel2, setSel2] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelOf = new Map(teams.map((t) => [t.id, t.label]));
  const started = stage === "started";
  const canManage = isAdmin && (stage === "matches_set" || started);

  async function createMatch() {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, team1_id: sel1, team2_id: sel2 }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create match");
      setCreating(false);
      return;
    }
    setSel1("");
    setSel2("");
    setCreating(false);
    setShowForm(false);
    router.refresh();
  }

  async function removeMatch(id: string) {
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    router.refresh();
  }

  // Grouping: knockout matches (bracket_pos set) get Final/Semis/QF names;
  // group-phase matches are plain "Round N"; manual adds are ungrouped.
  const knockout = matches.filter((m) => m.round !== null && m.bracket_pos !== null);
  const maxKR = knockout.reduce((acc, m) => Math.max(acc, m.round!), 0);
  const minKR = knockout.reduce((acc, m) => Math.min(acc, m.round!), Infinity);

  function groupNameOf(m: OcMatch): string {
    if (m.round === null) return "";
    if (m.bracket_pos !== null) {
      const remaining = maxKR - m.round;
      if (remaining === 0) return "🏆 Final";
      if (remaining === 1) return "Semifinals";
      if (remaining === 2) return "Quarterfinals";
      return `Knockout · Round ${m.round - minKR + 1}`;
    }
    return `Round ${m.round}`;
  }

  // Bye teams: seeded straight into a later knockout round without an earlier match
  const byeTeams = new Set<string>();
  for (const m of knockout) {
    if (m.round === minKR) continue;
    for (const tid of [m.team1_id, m.team2_id]) {
      if (!tid) continue;
      const playedEarlier = knockout.some(
        (k) => k.round! < m.round! && (k.team1_id === tid || k.team2_id === tid)
      );
      if (!playedEarlier) byeTeams.add(tid);
    }
  }

  const groups = new Map<string, OcMatch[]>();
  for (const m of matches) {
    const key = groupNameOf(m);
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }

  function teamLine(m: OcMatch, slot: 1 | 2) {
    const teamId = slot === 1 ? m.team1_id : m.team2_id;
    const score = slot === 1 ? m.team1_score : m.team2_score;
    const winner = m.status === "completed" && m.winning_team === slot;
    const isBye = teamId && m.status !== "completed" && byeTeams.has(teamId) && m.bracket_pos !== null;
    const label = teamId ? `${labelOf.get(teamId) ?? "?"}${isBye ? " ⤴ bye" : ""}` : "— TBD —";
    return (
      <p className={`text-sm truncate flex items-center justify-between gap-2 ${winner ? "font-bold text-heading" : teamId ? "text-text" : "text-muted-lighter italic"}`}>
        <span className="truncate">{winner && "✓ "}{label}</span>
        {m.status === "completed" && <span className="font-mono shrink-0">{score}</span>}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light">
          Matches ({matches.length}){matchFormat && matchFormat !== "manual" ? ` · ${{ single_elim: "knockout", round_robin: "round robin", fixed_rounds: "group rounds" }[matchFormat]}` : ""}
        </h2>
        {canManage && teams.length >= 2 && (
          <button onClick={() => setShowForm((v) => !v)} className="text-xs font-semibold text-sky-600 dark:text-sky-400">
            {showForm ? "Close" : "+ Add match"}
          </button>
        )}
      </div>

      {canManage && showForm && (
        <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3 flex flex-col gap-2">
          <select value={sel1} onChange={(e) => setSel1(e.target.value)} className={selectCls}>
            <option value="">Team 1…</option>
            {teams.filter((t) => t.id !== sel2).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={sel2} onChange={(e) => setSel2(e.target.value)} className={selectCls}>
            <option value="">Team 2…</option>
            {teams.filter((t) => t.id !== sel1).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button
            onClick={createMatch}
            disabled={creating || !sel1 || !sel2}
            className="w-full py-2.5 bg-stone-900 dark:bg-sky-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create match"}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}

      {matches.length === 0 && (
        <p className="text-sm text-muted px-1">
          {stage === "matches_set" ? "No matches yet — add them above." : "No matches yet."}
        </p>
      )}

      {(() => {
        // Newest round first (finals on top once reached), oldest last.
        const isDone = (ms: OcMatch[]) => ms.length > 0 && ms.every((m) => m.status === "completed");
        const groupRound = (ms: OcMatch[]) =>
          ms.reduce((acc, m) => Math.max(acc, m.round ?? Number.MAX_SAFE_INTEGER), 0);
        const ordered = [...groups.entries()].sort((a, b) => groupRound(b[1]) - groupRound(a[1]));
        return ordered.map(([groupName, ms]) => {
          const done = isDone(ms);
          const key = groupName || "flat";
          return (
        <div key={key} className="flex flex-col gap-2">
          {groupName && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted px-1 mt-1">
              {groupName}
              {done && <span className="text-green-600 dark:text-green-400 normal-case font-semibold"> ✓ done</span>}
            </p>
          )}
          {ms.map((m) => {
            const done = m.status === "completed";
            const ready = m.team1_id && m.team2_id;
            return (
              <div key={m.id} className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    {teamLine(m, 1)}
                    <p className="text-[10px] text-muted-lighter">vs</p>
                    {teamLine(m, 2)}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {done ? (
                      <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">Final</span>
                    ) : ready ? (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        {started ? "In progress" : "Scheduled"}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-lighter">Awaiting teams</span>
                    )}
                    {isAdmin && !done && m.round === null && (
                      <button onClick={() => removeMatch(m.id)} className="text-[11px] text-red-400 hover:text-red-500">
                        Delete
                      </button>
                    )}
                    {isAdmin && done && !eventCompleted && (
                      <button
                        onClick={() => setEditingId(editingId === m.id ? null : m.id)}
                        className="text-[11px] text-sky-500 dark:text-sky-400 hover:text-sky-600"
                      >
                        {editingId === m.id ? "Close" : "✎ Edit score"}
                      </button>
                    )}
                  </div>
                </div>
                {isAdmin && started && !done && ready && <ScoreEntry match={m} onDone={() => router.refresh()} />}
                {isAdmin && done && !eventCompleted && editingId === m.id && (
                  <ScoreEntry match={m} onDone={() => { setEditingId(null); router.refresh(); }} />
                )}
              </div>
            );
          })}
        </div>
          );
        });
      })()}
    </section>
  );
}
