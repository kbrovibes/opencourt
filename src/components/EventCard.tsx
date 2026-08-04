import NavLink from "@/components/NavLink";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatStartTime } from "@/lib/format";
import type { OcEvent } from "@/lib/db/events";

export default function EventCard({ event, count }: { event: OcEvent; count: number }) {
  return (
    <NavLink
      href={`/events/${event.id}`}
      className="block bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3 hover:bg-surface-alt transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-heading text-[15px] truncate">{event.name}</span>
        <StatusBadge status={event.status} />
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
        <span>🗓️ {formatDate(event.event_date)}{event.start_time ? ` · ${formatStartTime(event.start_time)}` : ""}</span>
        <span className="capitalize">{event.event_type === "doubles" ? "🤝 Doubles" : "🏸 Singles"}</span>
        <span>👥 {count}/{event.max_players}</span>
      </div>
    </NavLink>
  );
}
