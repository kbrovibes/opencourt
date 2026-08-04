import NavLink from "@/components/NavLink";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatStartTime } from "@/lib/format";
import { FORMAT_LABEL } from "@/lib/formats";
import type { OcEvent } from "@/lib/db/events";

export default function EventCard({ event, count }: { event: OcEvent; count: number }) {
  const shortLocation = event.location ? event.location.split(",")[0].trim() : null;
  return (
    <NavLink
      href={`/events/${event.id}`}
      className="block bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3 hover:bg-surface-alt transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-heading text-[15px] truncate">{event.name}</span>
        <StatusBadge status={event.status} />
      </div>
      {/* Two fixed columns keep every card's fields vertically aligned */}
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs text-muted">
        <span className="truncate">
          🗓️ {formatDate(event.event_date)}
          {event.start_time ? ` · ${formatStartTime(event.start_time)}` : ""}
        </span>
        <span className="text-right">👥 {count}/{event.max_players}</span>
        <span className="truncate">
          {shortLocation ? `📍 ${shortLocation}` : " "}
        </span>
        <span className="text-right">
          {event.event_type === "doubles" ? "🤝 Doubles" : "🏸 Singles"}
        </span>
        {event.match_format && (
          <span className="col-span-2 truncate text-muted-light">🏁 {FORMAT_LABEL[event.match_format]}</span>
        )}
      </div>
    </NavLink>
  );
}
