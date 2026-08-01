import { notFound, redirect } from "next/navigation";
import { getAuthPlayer } from "@/lib/auth";
import { checkinOpen, getEvent, getRoster } from "@/lib/db/events";
import { listMatches } from "@/lib/db/matches";
import { formatDate, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import ShareLink from "@/components/ShareLink";
import EventAdminControls from "@/components/EventAdminControls";
import MyEventActions from "@/components/MyEventActions";
import PartnerPicker from "@/components/PartnerPicker";
import MatchesSection from "@/components/MatchesSection";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getAuthPlayer();
  if (!player) redirect("/welcome");

  const event = await getEvent(id);
  if (!event) notFound();
  if (event.status === "draft" && !player.isAdmin) notFound();

  const [roster, matches] = await Promise.all([getRoster(event), listMatches(id)]);

  const me = roster.find((r) => r.player_id === player.id) ?? null;
  const checkedIn = roster.filter((r) => r.checked_in_at);
  const active = roster.length;
  const isOpen = checkinOpen(event);
  const isFull = checkedIn.length >= event.max_players;

  const nameById = new Map(roster.map((r) => [r.player_id, r.name]));

  // Mutual partner pairs for display
  const partnerOf = new Map(roster.map((r) => [r.player_id, r.partner_id]));
  function pairState(r: (typeof roster)[number]): { label: string; mutual: boolean } | null {
    if (!r.partner_id) return null;
    const mutual = partnerOf.get(r.partner_id) === r.player_id;
    return { label: nameById.get(r.partner_id) ?? "?", mutual };
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-5">
      <BackButton href="/" label="All events" />

      {/* Event info card */}
      <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold text-heading leading-tight">{event.name}</h1>
          <StatusBadge status={event.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <span>🗓️ {formatDate(event.event_date)}{event.start_time ? ` · ${event.start_time}` : ""}</span>
          <span>{event.event_type === "doubles" ? "🤝 Doubles" : "🏸 Singles"}</span>
          <span>👥 {active}/{event.max_players} registered</span>
          {event.location && <span>📍 {event.location}</span>}
        </div>
        {event.checkin_opens_at && (
          <p className="text-xs text-muted-light">
            Check-in {isOpen ? "opened" : "opens"} {formatDateTime(event.checkin_opens_at)}
          </p>
        )}
        {event.notes && <p className="text-[13px] text-text whitespace-pre-wrap">{event.notes}</p>}
        <ShareLink code={event.short_code} />
      </div>

      {player.isAdmin && <EventAdminControls event={event} />}

      {/* My actions */}
      {event.status === "live" && (
        <MyEventActions
          eventId={event.id}
          registered={!!me}
          checkedIn={!!me?.checked_in_at}
          waitlisted={!!me?.waitlisted}
          checkinIsOpen={isOpen}
          isFull={isFull}
        />
      )}

      {/* Partner picker — doubles, me checked in */}
      {event.event_type === "doubles" && me?.checked_in_at && event.status === "live" && (
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

      {/* Roster */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">
          Players ({active})
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
                    {event.event_type === "doubles" && pair && (
                      <span className="text-[11px] text-muted-light">
                        {pair.mutual ? `🤝 with ${pair.label}` : `→ ${pair.label} (pending)`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.checked_in_at ? (
                      <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">✓ Checked in</span>
                    ) : r.waitlisted ? (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Waitlist</span>
                    ) : (
                      <span className="text-[11px] text-muted-light">Registered</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Matches */}
      <MatchesSection
        eventId={event.id}
        eventType={event.event_type}
        eventStatus={event.status}
        isAdmin={player.isAdmin}
        matches={matches}
        players={checkedIn.map((r) => ({ id: r.player_id, name: r.name }))}
        nameById={Object.fromEntries(nameById)}
      />
    </div>
  );
}
