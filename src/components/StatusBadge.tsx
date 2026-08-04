import type { EventStatus } from "@/lib/db/events";

const STYLES: Record<EventStatus, string> = {
  live: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  completed: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

export default function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${STYLES[status]}`}>
      {status === "live" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
        </span>
      )}
      {status}
    </span>
  );
}
