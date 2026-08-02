import type { OcMatch } from "@/lib/db/matches";
import type { TeamStanding } from "@/lib/db/matches";

/* Server-rendered visual widgets for the tournament Overview tab. */

interface TeamInfo {
  id: string;
  seed: number;
  label: string;
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

/* ── Group-phase results matrix ── */
export function ResultsMatrix({ matches, teams }: { matches: OcMatch[]; teams: TeamInfo[] }) {
  const group = matches.filter((m) => m.bracket_pos === null);
  if (group.length === 0 || teams.length < 2) return null;

  // cell[row][col] = "21–15" from row team's perspective
  const cell = new Map<string, { text: string; won: boolean }>();
  for (const m of group) {
    if (m.status !== "completed" || !m.team1_id || !m.team2_id) continue;
    cell.set(`${m.team1_id}:${m.team2_id}`, { text: `${m.team1_score}–${m.team2_score}`, won: m.winning_team === 1 });
    cell.set(`${m.team2_id}:${m.team1_id}`, { text: `${m.team2_score}–${m.team1_score}`, won: m.winning_team === 2 });
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
      <table className="text-[11px] border-separate border-spacing-0.5 min-w-max">
        <thead>
          <tr>
            <th className="text-left pr-2 font-semibold text-muted-light">Team</th>
            {teams.map((t) => (
              <th key={t.id} className="w-12 text-center font-mono text-muted-light" title={t.label}>
                #{t.seed}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((row) => (
            <tr key={row.id}>
              <td className="pr-2 py-1 font-medium text-heading whitespace-nowrap">
                <span className="font-mono text-muted-light text-[10px] mr-1">#{row.seed}</span>
                {row.label}
              </td>
              {teams.map((col) => {
                if (row.id === col.id) {
                  return <td key={col.id} className="w-12 h-7 text-center bg-surface-alt rounded text-muted-lighter">—</td>;
                }
                const c = cell.get(`${row.id}:${col.id}`);
                if (!c) {
                  return (
                    <td key={col.id} className="w-12 h-7 text-center bg-surface rounded border border-border-light dark:border-border text-muted-lighter">
                      {scheduled.has(`${row.id}:${col.id}`) ? "·" : ""}
                    </td>
                  );
                }
                return (
                  <td
                    key={col.id}
                    className={`w-12 h-7 text-center rounded font-mono font-semibold ${
                      c.won
                        ? "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {c.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
