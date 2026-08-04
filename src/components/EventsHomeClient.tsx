"use client";

import { useMemo, useState } from "react";
import NavLink from "@/components/NavLink";
import EventCard from "@/components/EventCard";
import type { OcEvent } from "@/lib/db/events";

interface Props {
  events: OcEvent[];
  counts: Record<string, number>;
  isAdmin: boolean;
  todayISO: string; // IST
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const PAGE = 10;

function monthLabel(y: number, m: number) {
  return new Date(y, m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function EventsHomeClient({ events, counts, isAdmin, todayISO }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [pastLimit, setPastLimit] = useState(PAGE);

  const eventDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) map.set(e.event_date, (map.get(e.event_date) ?? 0) + 1);
    return map;
  }, [events]);

  // Calendar month being shown
  const [ty, tm] = todayISO.split("-").map((n) => parseInt(n, 10));
  const shown = new Date(ty, tm - 1 + monthOffset, 1);
  const y = shown.getFullYear();
  const m = shown.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const live = events.filter((e) => e.status === "live");
  const drafts = events.filter((e) => e.status === "draft");
  const past = events.filter((e) => e.status === "completed" || e.status === "cancelled");
  const filtered = selectedDate ? events.filter((e) => e.event_date === selectedDate) : null;

  const prettyDate = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "";

  return (
    <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-5">
      {isAdmin && (
        <NavLink
          href="/events/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-stone-900 dark:bg-sky-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-stone-800 dark:hover:bg-sky-500 transition-colors"
        >
          + Create Event
        </NavLink>
      )}

      {/* Calendar */}
      <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setMonthOffset(monthOffset - 1)}
            disabled={monthOffset <= -12}
            className="w-8 h-8 rounded-lg text-muted hover:bg-surface-alt disabled:opacity-30 text-lg"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-heading">{monthLabel(y, m)}</span>
          <button
            onClick={() => setMonthOffset(monthOffset + 1)}
            disabled={monthOffset >= 1}
            className="w-8 h-8 rounded-lg text-muted hover:bg-surface-alt disabled:opacity-30 text-lg"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="text-[10px] font-bold text-muted-lighter uppercase">{d}</span>
          ))}
          {Array.from({ length: firstDow }, (_, i) => <span key={`pad-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateISO = iso(y, m, day);
            const hasEvents = eventDates.has(dateISO);
            const isSelected = selectedDate === dateISO;
            const isToday = dateISO === todayISO;
            return (
              <button
                key={day}
                onClick={() => hasEvents && setSelectedDate(isSelected ? null : dateISO)}
                className={`relative mx-auto w-8 h-8 rounded-full text-xs flex flex-col items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-sky-600 text-white font-bold"
                    : isToday
                      ? "ring-1 ring-sky-500 text-heading font-semibold"
                      : hasEvents
                        ? "text-heading font-semibold hover:bg-surface-alt cursor-pointer"
                        : "text-muted-lighter cursor-default"
                }`}
              >
                {day}
                {hasEvents && !isSelected && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-sky-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date filter active */}
      {filtered ? (
        <section>
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light">
              Events on {prettyDate} ({filtered.length})
            </h2>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400"
            >
              Clear filter ✕
            </button>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted px-1">No events on this date.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((e) => <EventCard key={e.id} event={e} count={counts[e.id] ?? 0} />)}
            </div>
          )}
        </section>
      ) : (
        <>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">Ongoing & Open</h2>
            {live.length === 0 ? (
              <p className="text-sm text-muted px-1">No open events right now.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {live.map((e) => <EventCard key={e.id} event={e} count={counts[e.id] ?? 0} />)}
              </div>
            )}
          </section>

          {isAdmin && drafts.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">Drafts (admin only)</h2>
              <div className="flex flex-col gap-2">
                {drafts.map((e) => <EventCard key={e.id} event={e} count={counts[e.id] ?? 0} />)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1 mb-2">Past</h2>
              <div className="flex flex-col gap-2">
                {past.slice(0, pastLimit).map((e) => <EventCard key={e.id} event={e} count={counts[e.id] ?? 0} />)}
              </div>
              {past.length > pastLimit && (
                <button
                  onClick={() => setPastLimit(pastLimit + PAGE)}
                  className="mt-2 w-full py-2 bg-surface-alt text-text rounded-lg text-xs font-semibold hover:bg-border-light dark:hover:bg-border transition-colors"
                >
                  See more ({past.length - pastLimit} older)
                </button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
