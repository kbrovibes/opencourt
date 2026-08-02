"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventStage, EventType, MatchFormat } from "@/lib/db/events";

interface Props {
  eventId: string;
  stage: EventStage;
  eventType: EventType;
  matchFormat: MatchFormat | null;
  teamsCount: number;
  hasCompletedMatches: boolean;
}

const FORMATS: { value: MatchFormat; label: string; hint: string }[] = [
  { value: "single_elim", label: "🏆 Single elimination", hint: "Knockout bracket — losers are out, winners advance to the final" },
  { value: "round_robin", label: "🔁 Round robin", hint: "Every team plays every other team; best record wins" },
  { value: "manual", label: "✍️ Manual", hint: "You create each team-vs-team match yourself" },
];

export default function StagePanel({ eventId, stage, eventType, matchFormat, teamsCount, hasCompletedMatches }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<MatchFormat>(matchFormat ?? "single_elim");

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

  const primary = "flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50";
  const secondary = "py-2.5 px-3 rounded-lg text-sm font-semibold bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border transition-colors disabled:opacity-50";

  return (
    <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-light">Tournament</span>
        <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
          {stage.replace("_", " ")}
        </span>
      </div>

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
                className={`text-left px-3 py-2 rounded-lg border transition-colors ${
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
          <div className="flex gap-2">
            <button
              onClick={() => post(`/api/events/${eventId}/generate-matches`, { format })}
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
          <button onClick={() => setStage("started")} disabled={busy} className={`${primary} bg-green-600 hover:bg-green-500`}>
            🚀 Start tournament
          </button>
          <button onClick={() => setStage("teams_locked")} disabled={busy} className={secondary} title="Discards generated matches">
            ↩︎ Change format
          </button>
        </div>
      )}

      {stage === "started" && !hasCompletedMatches && (
        <button onClick={() => setStage("matches_set")} disabled={busy} className={secondary}>
          ⏸ Un-start (no scores yet)
        </button>
      )}
      {stage === "started" && hasCompletedMatches && (
        <p className="text-[11px] text-muted-light">Tournament running — enter scores in the Matches tab.</p>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
