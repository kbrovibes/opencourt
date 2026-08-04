import { notFound, redirect } from "next/navigation";
import { getAuthPlayer } from "@/lib/auth";
import { checkinOpen, getEvent, getRoster } from "@/lib/db/events";
import { listMatches, computeTeamStandings } from "@/lib/db/matches";
import { listTeams } from "@/lib/db/teams";
import { listPlayers } from "@/lib/db/players";
import { formatDate, formatDateTime, formatStartTime, titleCaseName } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import ShareLink from "@/components/ShareLink";
import EventAdminControls from "@/components/EventAdminControls";
import MyEventActions from "@/components/MyEventActions";
import PartnerPicker from "@/components/PartnerPicker";
import MatchesSection from "@/components/MatchesSection";
import TeamFormationPanel from "@/components/TeamFormationPanel";
import StagePanel from "@/components/StagePanel";
import EventTabs from "@/components/EventTabs";
import BackButton from "@/components/BackButton";
import { BracketView, MatchProgress, ResultsMatrix } from "@/components/TournamentVisuals";
import NavLink from "@/components/NavLink";
import CopyCheckins from "@/components/CopyCheckins";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getAuthPlayer();
  if (!player) redirect("/welcome");

  const event = await getEvent(id);
  if (!event) notFound();
  if (event.status === "draft" && !player.isAdmin) notFound();

  const [roster, matches, teams, allPlayers] = await Promise.all([
    getRoster(event),
    listMatches(id),
    listTeams(id),
    listPlayers(true),
  ]);

  // Copied event: offer the source event's roster for one-tap re-check-in
  let copySource: { name: string; players: { id: string; name: string }[] } | null = null;
  if (player.isAdmin && event.copied_from && event.stage === "roster") {
    const src = await getEvent(event.copied_from);
    if (src) {
      const srcRoster = await getRoster(src);
      const alreadyIn = new Set(roster.filter((r) => r.checked_in_at).map((r) => r.player_id));
      copySource = {
        name: src.name,
        players: srcRoster.filter((r) => !alreadyIn.has(r.player_id)).map((r) => ({ id: r.player_id, name: r.name })),
      };
    }
  }

  const me = roster.find((r) => r.player_id === player.id) ?? null;
  const checkedIn = roster.filter((r) => r.checked_in_at);
  const isOpen = checkinOpen(event);
  const isFull = checkedIn.length >= event.max_players;

  const nameById = new Map(allPlayers.map((p) => [p.id, titleCaseName(p.name)]));
  const teamLabel = (t: { player1_id: string; player2_id: string | null }) =>
    [t.player1_id, t.player2_id]
      .filter(Boolean)
      .map((pid) => nameById.get(pid!) ?? "?")
      .join(" & ");
  const teamOpts = teams.map((t) => ({
    id: t.id,
    seed: t.seed,
    groupNo: t.group_no,
    label: teamLabel(t),
    shortNames: [t.player1_id, t.player2_id]
      .filter(Boolean)
      .map((pid) => (nameById.get(pid!) ?? "?").split(" ")[0]),
    playerIds: [t.player1_id, t.player2_id].filter(Boolean) as string[],
  }));
  const labelByTeam = new Map(teamOpts.map((t) => [t.id, t.label]));

  const standings = computeTeamStandings(matches);

  // Champion / runner-up: winner of the last knockout round (single elim or playoffs)
  const knockout = matches.filter((m) => m.round !== null && m.bracket_pos !== null);
  const maxKR = knockout.reduce((acc, m) => Math.max(acc, m.round ?? 0), 0);
  let champion: string | null = null;
  let runnerUp: string | null = null;
  if (maxKR > 0) {
    // The final may be a best-of series — champion once a team clinches the majority
    const finals = knockout.filter((m) => m.round === maxKR);
    const need = Math.floor(finals.length / 2) + 1;
    const winCount = new Map<string, number>();
    for (const f of finals) {
      if (f.status !== "completed" || !f.winning_team) continue;
      const w = f.winning_team === 1 ? f.team1_id : f.team2_id;
      if (w) winCount.set(w, (winCount.get(w) ?? 0) + 1);
    }
    const leader = [...winCount.entries()].sort((a, b) => b[1] - a[1])[0];
    if (leader && leader[1] >= need) {
      champion = labelByTeam.get(leader[0]) ?? null;
      const anyFinal = finals.find((f) => f.team1_id && f.team2_id) ?? finals[0];
      const otherId = anyFinal?.team1_id === leader[0] ? anyFinal?.team2_id : anyFinal?.team1_id;
      runnerUp = otherId ? labelByTeam.get(otherId) ?? null : null;
    }
  }
  // Group-only events: champion only once the event itself is completed
  // (all-group-matches-done alone isn't decisive — admin may still add playoffs)
  if (!champion && maxKR === 0 && event.status === "completed" && matches.length > 0 && matches.every((m) => m.status === "completed") && standings.length > 0) {
    champion = labelByTeam.get(standings[0].teamId) ?? null;
    runnerUp = standings[1] ? labelByTeam.get(standings[1].teamId) ?? null : null;
  }

  // Mutual partner display
  const partnerOf = new Map(roster.map((r) => [r.player_id, r.partner_id]));
  function pairState(r: (typeof roster)[number]): { label: string; mutual: boolean } | null {
    if (!r.partner_id) return null;
    const mutual = partnerOf.get(r.partner_id) === r.player_id;
    return { label: nameById.get(r.partner_id) ?? "?", mutual };
  }

  const inTournament = event.stage === "matches_set" || event.stage === "started";

  const rosterSection = (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">
        Players ({roster.length})
      </h2>
      {roster.length === 0 ? (
        <p className="text-sm text-muted px-1">Nobody has registered yet.</p>
      ) : (
        <div className="bg-surface rounded-xl border border-border-light dark:border-border divide-y divide-border-light dark:divide-border">
          {roster.map((r) => {
            const pair = pairState(r);
            return (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-heading">
                    {r.name}
                    {r.player_id === player.id && <span className="text-muted-light font-normal"> (you)</span>}
                  </span>
                  {event.event_type === "doubles" && event.stage === "roster" && pair && (
                    <span className="text-[11px] text-muted-light">
                      {pair.mutual ? `🤝 with ${pair.label}` : `→ ${pair.label} (pending)`}
                    </span>
                  )}
                </div>
                {r.checked_in_at ? (
                  <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">✓ Checked in</span>
                ) : r.waitlisted ? (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Waitlist</span>
                ) : (
                  <span className="text-[11px] text-muted-light">Registered</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  const teamsSection = teamOpts.length > 0 && (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">
        Teams ({teamOpts.length})
      </h2>
      <div className="bg-surface rounded-xl border border-border-light dark:border-border divide-y divide-border-light dark:divide-border">
        {teamOpts.map((t) => (
          <div key={t.id} className="flex items-center px-4 py-2.5">
            <span className="w-8 text-xs font-mono text-muted-light">#{t.seed}</span>
            <span className="flex-1 text-sm font-medium text-heading truncate">{t.label}</span>
            {t.groupNo !== null && (
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">Grp {"ABCDEFGH"[t.groupNo]}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );

  const groupNos = [...new Set(teamOpts.map((t) => t.groupNo).filter((g) => g !== null))].sort() as number[];

  const standingsTable = (rows: typeof standings) => (
    <div className="bg-surface rounded-xl border border-border-light dark:border-border divide-y divide-border-light dark:divide-border">
      {rows.map((s, i) => (
        <div key={s.teamId} className="flex items-center px-4 py-2.5">
          <span className="w-6 text-xs text-muted-light">{i + 1}</span>
          <span className="flex-1 text-sm font-medium text-heading truncate">{labelByTeam.get(s.teamId) ?? "?"}</span>
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">{s.wins}W</span>
          <span className="text-sm text-muted ml-2">{s.losses}L</span>
          <span className="text-[11px] text-muted-light ml-3 font-mono">
            {s.pointsFor - s.pointsAgainst >= 0 ? "+" : ""}{s.pointsFor - s.pointsAgainst}
          </span>
        </div>
      ))}
    </div>
  );

  const standingsSection = (
    <section className="flex flex-col gap-3">
      {standings.length === 0 ? (
        <p className="text-sm text-muted px-1">No completed matches yet.</p>
      ) : groupNos.length > 1 ? (
        groupNos.map((g) => {
          const ids = new Set(teamOpts.filter((t) => t.groupNo === g).map((t) => t.id));
          const rows = computeTeamStandings(matches.filter((m) => m.group_no === g)).filter((s) => ids.has(s.teamId));
          return (
            <div key={g} className="flex flex-col gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted px-1">Group {"ABCDEFGH"[g]}</p>
              {standingsTable(rows)}
            </div>
          );
        })
      ) : (
        <>{standingsTable(standings)}</>
      )}
    </section>
  );

  const isCompleted = event.status === "completed";

  // Overview: while running — progress + (champion once decided); once the event
  // is completed the top-of-page banner owns all winner/stat info, so the
  // overview keeps only the visual record (bracket + matrix).
  const overviewSection = (
    <div className="flex flex-col gap-4">
      {!isCompleted && <MatchProgress matches={matches} />}
      {!isCompleted && champion && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-2.5 text-center">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">🏆 Champions: {champion}</p>
          {runnerUp && <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">Runners-up: {runnerUp}</p>}
        </div>
      )}
      <BracketView matches={matches} teams={teamOpts} />
      {groupNos.length > 1 ? (
        groupNos.map((g) => (
          <div key={g} className="flex flex-col gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted px-1">Group {"ABCDEFGH"[g]}</p>
            <ResultsMatrix
              matches={matches.filter((m) => m.group_no === g)}
              teams={teamOpts.filter((t) => t.groupNo === g)}
              canScore={player.isAdmin && event.stage === "started" && !isCompleted}
            />
          </div>
        ))
      ) : (
        <ResultsMatrix matches={matches} teams={teamOpts} canScore={player.isAdmin && event.stage === "started" && !isCompleted} />
      )}
    </div>
  );

  const matchesSection = (
    <MatchesSection
      eventId={event.id}
      stage={event.stage}
      eventCompleted={isCompleted}
      matchFormat={event.match_format}
      isAdmin={player.isAdmin}
      matches={matches}
      teams={teamOpts}
    />
  );

  return (
    <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-5">
      <BackButton href="/" label="All events" />

      {/* Closed-event summary */}
      {event.status === "completed" && (
        <div className="bg-surface rounded-xl border border-amber-300 dark:border-amber-700/60 px-4 py-4 flex flex-col gap-3">
          <div className="text-center">
            <p className="text-3xl leading-none mb-1.5">🏆</p>
            <p className="text-base font-bold text-heading">
              {champion ?? (standings[0] ? labelByTeam.get(standings[0].teamId) : null) ?? "Event completed"}
            </p>
            {champion && <p className="text-[11px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold">Champions</p>}
            {(runnerUp ?? (standings[1] && labelByTeam.get(standings[1].teamId))) && (
              <p className="text-xs text-muted mt-1">
                🥈 {runnerUp ?? labelByTeam.get(standings[1].teamId)}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { emoji: "👥", val: checkedIn.length, label: "Players" },
              { emoji: "🎯", val: matches.filter((m) => m.status === "completed").length, label: "Matches" },
              { emoji: "🏸", val: matches.reduce((sum, m) => sum + (m.team1_score ?? 0) + (m.team2_score ?? 0), 0), label: "Points" },
            ].map(({ emoji, val, label }) => (
              <div key={label} className="bg-surface-alt rounded-lg py-2 flex flex-col items-center gap-0.5">
                <span className="text-base leading-none">{emoji}</span>
                <span className="text-lg font-bold text-heading leading-none">{val}</span>
                <span className="text-[10px] font-semibold text-muted-light">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event info card */}
      <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold text-heading leading-tight">{event.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            {player.isAdmin && (
              <NavLink href={`/events/${event.id}/edit`} className="text-xs text-muted hover:text-heading" title="Edit event">
                ✏️
              </NavLink>
            )}
            <StatusBadge status={event.status} />
            {event.status === "live" && event.stage !== "roster" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">
                {{ team_formation: "teams", teams_locked: "locked", matches_set: "matches", started: "in play" }[event.stage]}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <span>🗓️ {formatDate(event.event_date)}{event.start_time ? ` · ${formatStartTime(event.start_time)}` : ""}</span>
          <span>{event.event_type === "doubles" ? "🤝 Doubles" : "🏸 Singles"}</span>
          <span>👥 {roster.length}/{event.max_players} registered</span>
          {event.location && <span>📍 {event.location}</span>}
          <ShareLink code={event.short_code} />
        </div>
        {event.checkin_opens_at && (
          <p className="text-xs text-muted-light">
            Check-in {isOpen ? "opened" : "opens"} {formatDateTime(event.checkin_opens_at)}
          </p>
        )}
        {event.notes && <p className="text-[13px] text-text whitespace-pre-wrap">{event.notes}</p>}
      </div>

      {player.isAdmin && <EventAdminControls event={event} canUnstart={event.stage === "started" && !matches.some((m) => m.status === "completed")} canStart={event.stage === "matches_set"} />}
      {copySource && (
        <CopyCheckins eventId={event.id} sourceName={copySource.name} players={copySource.players} />
      )}
      {player.isAdmin && event.status === "live" && (
        <StagePanel
          eventId={event.id}
          stage={event.stage}
          eventType={event.event_type}
          matchFormat={event.match_format}
          teamsCount={teams.length}
          hasCompletedMatches={matches.some((m) => m.status === "completed")}
          hasKnockout={knockout.length > 0}
          groupPending={matches.filter((m) => m.bracket_pos === null && m.status !== "completed").length}
        />
      )}

      {/* Self actions — roster building phase only */}
      {event.status === "live" && event.stage === "roster" && (
        <MyEventActions
          eventId={event.id}
          registered={!!me}
          checkedIn={!!me?.checked_in_at}
          waitlisted={!!me?.waitlisted}
          checkinIsOpen={isOpen}
          isFull={isFull}
          mySkill={player.skillLevel}
        />
      )}

      {event.event_type === "doubles" && me?.checked_in_at && event.status === "live" && event.stage === "roster" && (
        <PartnerPicker
          eventId={event.id}
          myPartnerId={me.partner_id}
          candidates={checkedIn
            .filter((r) => r.player_id !== player.id)
            .map((r) => ({
              id: r.player_id,
              name: r.name,
              takenBy: r.partner_id && r.partner_id !== player.id ? nameById.get(r.partner_id) ?? null : null,
              picksMe: r.partner_id === player.id,
            }))}
        />
      )}

      {/* Stage-specific body */}
      {event.stage === "team_formation" && player.isAdmin && (
        <TeamFormationPanel
          eventId={event.id}
          eventType={event.event_type}
          checkedIn={checkedIn.map((r) => ({ id: r.player_id, name: r.name }))}
          teams={teamOpts}
        />
      )}

      {inTournament ? (
        <EventTabs
          initial={event.stage === "started" ? "overview" : "matches"}
          tabs={[
            { key: "overview", label: "Overview", content: overviewSection },
            { key: "matches", label: `Matches`, content: matchesSection },
            { key: "standings", label: "Standings", content: standingsSection },
            { key: "players", label: "Players", content: <div className="flex flex-col gap-4">{teamsSection}{rosterSection}</div> },
          ]}
        />
      ) : (
        <>
          {event.stage !== "team_formation" && teamsSection}
          {event.stage === "team_formation" && !player.isAdmin && teamsSection}
          {rosterSection}
        </>
      )}
    </div>
  );
}
