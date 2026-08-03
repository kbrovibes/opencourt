"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OcMatch } from "@/lib/db/matches";

/* Visual widgets for the tournament Overview tab. */

interface TeamInfo {
  id: string;
  seed: number;
  label: string;
  shortNames?: string[]; // first names, one per line in compact views
}

/* ── Progress bar ── */
export function MatchProgress({ matches }: { matches: OcMatch[] }) {
  const total = matches.length;
  const done = matches.filter((m) => m.status === "completed").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-light">Progress</span>
        <span className="text-xs text-muted">{done}/{total} matches · {pct}%</span>
      </div>
      <div className="h-2.5 bg-surface-alt rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-green-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Knockout bracket — horizontal columns, winner highlighted ── */
export function BracketView({ matches, teams }: { matches: OcMatch[]; teams: TeamInfo[] }) {
  const knockout = matches
    .filter((m) => m.round !== null && m.bracket_pos !== null)
    .sort((a, b) => a.round! - b.round! || a.bracket_pos! - b.bracket_pos!);
  if (knockout.length === 0) return null;

  const labelOf = new Map(teams.map((t) => [t.id, t.label]));
  const rounds = [...new Set(knockout.map((m) => m.round!))].sort((a, b) => a - b);
  const maxKR = rounds[rounds.length - 1];

  function roundTitle(r: number) {
    const remaining = maxKR - r;
    if (remaining === 0) return "Final";
    if (remaining === 1) return "Semifinals";
    if (remaining === 2) return "Quarterfinals";
    return `Round ${r - rounds[0] + 1}`;
  }

  function slot(m: OcMatch, n: 1 | 2) {
    const tid = n === 1 ? m.team1_id : m.team2_id;
    const score = n === 1 ? m.team1_score : m.team2_score;
    const won = m.status === "completed" && m.winning_team === n;
    const lost = m.status === "completed" && m.winning_team !== null && !won;
    return (
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 text-[12px] ${
          won
            ? "font-bold text-green-600 dark:text-green-400"
            : lost
              ? "text-muted-light line-through decoration-1"
              : tid
                ? "text-heading font-medium"
                : "text-muted-lighter italic"
        }`}
      >
        <span className="truncate">{tid ? labelOf.get(tid) ?? "?" : "TBD"}</span>
        {m.status === "completed" && <span className="font-mono">{score}</span>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1">
      <div className="flex gap-4 min-w-max items-stretch">
        {rounds.map((r) => {
          const ms = knockout.filter((m) => m.round === r);
          return (
            <div key={r} className="flex flex-col w-44">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-light mb-2 text-center">
                {roundTitle(r)}
              </p>
              <div className="flex-1 flex flex-col justify-around gap-3">
                {ms.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg border divide-y overflow-hidden ${
                      m.status === "completed"
                        ? "border-green-300 dark:border-green-700/60 divide-green-200 dark:divide-green-800/40 bg-surface"
                        : m.team1_id && m.team2_id
                          ? "border-sky-300 dark:border-sky-700/60 divide-border-light dark:divide-border bg-surface"
                          : "border-dashed border-border dark:border-border divide-border-light dark:divide-border bg-surface-alt/50"
                    }`}
                  >
                    {slot(m, 1)}
                    {slot(m, 2)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Score dialog (double-tap a matrix cell) ── */
function ScoreDialog({ match, labelOf, onClose }: { match: OcMatch; labelOf: Map<string, string>; onClose: () => void }) {
  const router = useRouter();
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
      setError(data.error ?? "Failed to save");
      setBusy(false);
      return;
    }
    setBusy(false);
    onClose();
    router.refresh();
  }

  const inputCls =
    "w-20 px-2 py-2 bg-surface-alt border border-stone-300 dark:border-border rounded-lg text-base text-center text-text focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-overlay backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xs bg-surface border border-border-light dark:border-border rounded-2xl shadow-xl dark:shadow-none dark:ring-1 dark:ring-border p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-heading leading-snug">
          {labelOf.get(match.team1_id ?? "") ?? "?"}
          <span className="text-muted-light font-normal text-xs mx-1.5">vs</span>
          {labelOf.get(match.team2_id ?? "") ?? "?"}
        </h3>
        <div className="flex items-center justify-center gap-3">
          <input type="number" min={0} value={t1} onChange={(e) => setT1(e.target.value)} className={inputCls} autoFocus />
          <span className="text-sm text-muted">—</span>
          <input type="number" min={0} value={t2} onChange={(e) => setT2(e.target.value)} className={inputCls} />
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400 text-center">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={busy} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border transition-colors disabled:opacity-50">
            Close
          </button>
          <button
            onClick={save}
            disabled={busy || t1 === "" || t2 === ""}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 transition-colors disabled:opacity-50"
          >
            {busy ? "…" : "Save score"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Group-phase results matrix ── */
export function ResultsMatrix({ matches, teams, canScore }: { matches: OcMatch[]; teams: TeamInfo[]; canScore?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dialogMatch, setDialogMatch] = useState<OcMatch | null>(null);
  const lastTap = useRef<{ key: string; t: number }>({ key: "", t: 0 });
  const group = matches.filter((m) => m.bracket_pos === null);
  if (group.length === 0 || teams.length < 2) return null;

  const labelOf = new Map(teams.map((t) => [t.id, t.label]));
  const matchFor = (a: string, b: string) => {
    const pair = group
      .filter(
        (m) =>
          (m.team1_id === a && m.team2_id === b) || (m.team1_id === b && m.team2_id === a)
      )
      .sort((x, y) => x.created_at.localeCompare(y.created_at));
    if (pair.length === 0) return null;
    return pair.filter((m) => m.status !== "completed").pop() ?? pair[pair.length - 1];
  };

  function cellProps(rowId: string, colId: string) {
    const key = `${rowId}:${colId}`;
    const m = matchFor(rowId, colId);
    return {
      // dblclick is unreliable on touch — detect double-tap by click timing instead
      onClick: () => {
        const now = Date.now();
        if (lastTap.current.key === key && now - lastTap.current.t < 400) {
          lastTap.current = { key: "", t: 0 };
          if (canScore && m) setDialogMatch(m);
          return;
        }
        lastTap.current = { key, t: now };
        setSelected(selected === key ? null : key);
      },
    };
  }

  // cell[row][col] = every completed result between the pair, oldest first,
  // from the row team's perspective (repeat matchups all show)
  const cell = new Map<string, { text: string; won: boolean }[]>();
  const push = (key: string, entry: { text: string; won: boolean }) => {
    const list = cell.get(key) ?? [];
    list.push(entry);
    cell.set(key, list);
  };
  for (const m of group) {
    if (m.status !== "completed" || !m.team1_id || !m.team2_id) continue;
    push(`${m.team1_id}:${m.team2_id}`, { text: `${m.team1_score}–${m.team2_score}`, won: m.winning_team === 1 });
    push(`${m.team2_id}:${m.team1_id}`, { text: `${m.team2_score}–${m.team1_score}`, won: m.winning_team === 2 });
  }
  const scheduled = new Set<string>();
  for (const m of group) {
    if (m.team1_id && m.team2_id) {
      scheduled.add(`${m.team1_id}:${m.team2_id}`);
      scheduled.add(`${m.team2_id}:${m.team1_id}`);
    }
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className={`text-[11px] border-separate border-spacing-1 ${teams.length <= 5 ? "w-full" : "min-w-max"}`}>
        <thead>
          <tr>
            <th className="text-left pr-2 font-semibold text-muted-light">Team</th>
            {teams.map((t) => (
              <th key={t.id} className="min-w-12 text-center font-mono text-muted-light" title={t.label}>
                #{t.seed}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((row) => (
            <tr key={row.id}>
              <td className="pr-3 py-2 font-medium text-heading whitespace-nowrap align-middle w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-muted-light text-[10px]">#{row.seed}</span>
                  <span className="leading-tight">
                    {(row.shortNames ?? [row.label]).map((n) => (
                      <span key={n} className="block">{n}</span>
                    ))}
                  </span>
                </div>
              </td>
              {teams.map((col) => {
                if (row.id === col.id) {
                  return <td key={col.id} className="min-w-12 h-10 text-center bg-surface-alt rounded text-muted-lighter">—</td>;
                }
                const key = `${row.id}:${col.id}`;
                const sel = selected === key ? " ring-2 ring-sky-500 ring-inset" : "";
                const list = cell.get(key);
                if (!list || list.length === 0) {
                  return (
                    <td
                      key={col.id}
                      {...cellProps(row.id, col.id)}
                      className={`min-w-12 h-10 text-center bg-surface rounded border border-border-light dark:border-border text-muted-lighter cursor-pointer select-none touch-manipulation${sel}`}
                    >
                      {scheduled.has(key) ? "·" : ""}
                    </td>
                  );
                }
                if (list.length === 1) {
                  return (
                    <td
                      key={col.id}
                      {...cellProps(row.id, col.id)}
                      className={`min-w-12 h-10 text-center rounded font-mono font-semibold cursor-pointer select-none touch-manipulation${sel} ${
                        list[0].won
                          ? "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400"
                          : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {list[0].text}
                    </td>
                  );
                }
                // Repeat matchups: every result on its own line
                return (
                  <td
                    key={col.id}
                    {...cellProps(row.id, col.id)}
                    className={`min-w-12 min-h-10 text-center rounded font-mono font-semibold bg-surface border border-border-light dark:border-border cursor-pointer select-none touch-manipulation${sel}`}
                  >
                    <span className="flex flex-col leading-snug py-1">
                      {list.map((c, i) => (
                        <span
                          key={i}
                          className={c.won ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                        >
                          {c.text}
                        </span>
                      ))}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {dialogMatch && <ScoreDialog match={dialogMatch} labelOf={labelOf} onClose={() => setDialogMatch(null)} />}
    </div>
  );
}
