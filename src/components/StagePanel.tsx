"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { EventStage, EventType, MatchFormat } from "@/lib/db/events";

interface Props {
  eventId: string;
  stage: EventStage;
  eventType: EventType;
  matchFormat: MatchFormat | null;
  teamsCount: number;
  hasCompletedMatches: boolean;
  hasKnockout: boolean;       // any bracket matches exist (playoffs or knockout)
  groupPending: number;       // pending group matches
}

const FORMATS: { value: MatchFormat; label: string; hint: string }[] = [
  { value: "groups", label: "🌍 Groups + knockout", hint: "FIFA style — split into groups, round robin inside, top 2 cross into a knockout" },
  { value: "fixed_rounds", label: "🔄 Fixed rounds", hint: "Everyone plays the same number of matches; add playoffs at the end" },
  { value: "round_robin", label: "🔁 Round robin", hint: "Every team plays every other team (one big group); best record wins" },
  { value: "single_elim", label: "🏆 Single elimination", hint: "Pure knockout — losers are out. Fairest with 4, 8 or 16 teams" },
  { value: "manual", label: "✍️ Manual", hint: "You create each team-vs-team match yourself" },
];

const isPow2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

export default function StagePanel({ eventId, stage, eventType, matchFormat, teamsCount, hasCompletedMatches, hasKnockout, groupPending }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<MatchFormat>(matchFormat ?? (teamsCount >= 4 ? "groups" : "fixed_rounds"));
  const [numGroups, setNumGroups] = useState("2");
  const [roundsPerTeam, setRoundsPerTeam] = useState("3");
  const [pendingReset, setPendingReset] = useState<"scores" | "event" | null>(null);
  const [bestOf, setBestOf] = useState("1");

  async function post(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(path, {
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

  const setStage = (s: EventStage) => post(`/api/events/${eventId}/stage`, { stage: s });

  const primary = "flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50";
  const secondary = "py-2 px-3 rounded-lg text-xs font-semibold bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border transition-colors disabled:opacity-50";

  const groupFormat = matchFormat === "round_robin" || matchFormat === "fixed_rounds" || matchFormat === "manual" || matchFormat === "groups";

  return (
    <div className="flex flex-col gap-2.5">
      {stage === "roster" && (
        <button onClick={() => setStage("team_formation")} disabled={busy} className={`${primary} bg-sky-600 hover:bg-sky-500`}>
          👥 Start team formation
        </button>
      )}

      {stage === "team_formation" && (
        <div className="flex gap-2">
          <button
            onClick={() => setStage("teams_locked")}
            disabled={busy || teamsCount < 2}
            className={`${primary} bg-green-600 hover:bg-green-500`}
          >
            🔒 Finalize teams ({teamsCount})
          </button>
          <button onClick={() => setStage("roster")} disabled={busy} className={secondary}>
            ↩︎ Back
          </button>
        </div>
      )}

      {stage === "teams_locked" && (
        <>
          <div className="flex flex-col gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={`text-left px-3 py-1.5 rounded-lg border transition-colors ${
                  format === f.value
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10"
                    : "border-border-light dark:border-border bg-surface-alt hover:border-sky-300"
                }`}
              >
                <span className="text-sm font-semibold text-heading">{f.label}</span>
                <p className="text-[11px] text-muted-light">{f.hint}</p>
              </button>
            ))}
          </div>
          {format === "single_elim" && (
            <div className="flex items-center justify-between px-1">
            <label className="text-xs text-text">Final — best of</label>
              <div className="flex bg-surface-alt rounded-lg p-0.5">
              {["1", "3", "5"].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBestOf(n)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    bestOf === n ? "bg-surface text-heading shadow-sm" : "text-text-light hover:text-text"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            </div>
          )}
          {format === "groups" && (
            <div className="flex items-center justify-between px-1">
              <label className="text-xs text-text">Number of groups</label>
              <div className="flex bg-surface-alt rounded-lg p-0.5">
                {["2", "4"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={parseInt(n, 10) * 2 > teamsCount}
                    onClick={() => setNumGroups(n)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-30 ${
                      numGroups === n ? "bg-surface text-heading shadow-sm" : "text-text-light hover:text-text"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          {format === "single_elim" && !isPow2(teamsCount) && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 px-1">
              ⚠ {teamsCount} teams don&apos;t fill a bracket — a random draw gives some teams a first-round bye.
              Groups + knockout keeps play even for everyone.
            </p>
          )}
          {format === "fixed_rounds" && (
            <div className="flex items-center justify-between px-1">
              <label className="text-sm text-text">Matches per team</label>
              <input
                type="number"
                min={1}
                max={Math.max(1, teamsCount - 1)}
                value={roundsPerTeam}
                onChange={(e) => setRoundsPerTeam(e.target.value)}
                className="w-20 px-2.5 py-1.5 bg-surface-alt border border-stone-300 dark:border-border rounded-lg text-sm text-center text-text focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => post(`/api/events/${eventId}/generate-matches`, { format, rounds_per_team: roundsPerTeam, finals_best_of: bestOf, num_groups: numGroups })}
              disabled={busy}
              className={`${primary} bg-sky-600 hover:bg-sky-500`}
            >
              ⚡ Set up matches
            </button>
            <button onClick={() => setStage("team_formation")} disabled={busy} className={secondary}>
              ✏️ Edit teams
            </button>
          </div>
        </>
      )}

      {stage === "matches_set" && (
        <div className="flex gap-2">
          <button onClick={() => setStage("teams_locked")} disabled={busy} className={`flex-1 ${secondary}`} title="Discards generated matches">
            ↩︎ Change format
          </button>
          <button onClick={() => setStage("team_formation")} disabled={busy} className={`flex-1 ${secondary}`} title="Discards generated matches">
            ✏️ Edit teams
          </button>
        </div>
      )}

      {stage === "started" && (
        <>
          {/* Playoffs for group formats once group play is done */}
          {groupFormat && !hasKnockout && (
            groupPending === 0 && hasCompletedMatches ? (
              <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs text-text">Final — best of</label>
                <div className="flex bg-surface-alt rounded-lg p-0.5">
                  {["1", "3", "5"].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBestOf(n)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        bestOf === n ? "bg-surface text-heading shadow-sm" : "text-text-light hover:text-text"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {matchFormat === "groups" ? (
                <button
                  onClick={() => post(`/api/events/${eventId}/playoffs`, { best_of: bestOf })}
                  disabled={busy}
                  className={`${primary} bg-amber-600 hover:bg-amber-500`}
                >
                  🏆 Generate knockout (top 2 per group)
                </button>
              ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => post(`/api/events/${eventId}/playoffs`, { size: 2, best_of: bestOf })}
                  disabled={busy}
                  className={`${primary} bg-amber-600 hover:bg-amber-500`}
                >
                  🏆 Final (top 2)
                </button>
                {teamsCount >= 4 && (
                  <button
                    onClick={() => post(`/api/events/${eventId}/playoffs`, { size: 4, best_of: bestOf })}
                    disabled={busy}
                    className={`${primary} bg-amber-600 hover:bg-amber-500`}
                  >
                    🏆 Semis + Final (top 4)
                  </button>
                )}
              </div>
              )}
              </div>
            ) : groupPending > 0 ? (
              <p className="text-[11px] text-muted-light px-1">
                {groupPending} group match{groupPending > 1 ? "es" : ""} left — playoffs unlock when they're done.
              </p>
            ) : null
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setPendingReset("scores")}
              disabled={busy || !hasCompletedMatches}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold bg-surface-alt text-amber-600 dark:text-amber-400 hover:bg-border-light dark:hover:bg-border transition-colors disabled:opacity-40`}
            >
              ↺ Reset scores
            </button>
            <button
              onClick={() => setPendingReset("event")}
              disabled={busy}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold bg-surface-alt text-red-600 dark:text-red-400 hover:bg-border-light dark:hover:bg-border transition-colors disabled:opacity-40`}
            >
              ⟲ Reset event
            </button>
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <ConfirmDialog
        open={pendingReset === "scores"}
        title="Reset all scores?"
        message="Every match goes back to unplayed. Bracket winners are rewound; teams and the match lineup stay exactly as they are."
        confirmLabel="Reset scores"
        danger
        busy={busy}
        onConfirm={async () => {
          await post(`/api/events/${eventId}/reset`, { mode: "scores" });
          setPendingReset(null);
        }}
        onClose={() => setPendingReset(null)}
      />
      <ConfirmDialog
        open={pendingReset === "event"}
        title="Reset the event?"
        message="All matches and scores are deleted and the event returns to locked teams. Roster, check-ins and teams are kept — you can re-pick the format or edit teams from there."
        confirmLabel="Reset event"
        danger
        busy={busy}
        onConfirm={async () => {
          await post(`/api/events/${eventId}/reset`, { mode: "event" });
          setPendingReset(null);
        }}
        onClose={() => setPendingReset(null)}
      />
    </div>
  );
}
