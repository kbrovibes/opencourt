"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  eventId: string;
  registered: boolean;
  checkedIn: boolean;
  waitlisted: boolean;
  checkinIsOpen: boolean;
  isFull: boolean;
}

export default function MyEventActions({ eventId, registered, checkedIn, waitlisted, checkinIsOpen, isFull }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {!registered && (
          <button
            onClick={() => post(`/api/events/${eventId}/register`, {})}
            disabled={busy}
            className="flex-1 py-3 bg-stone-900 dark:bg-sky-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-stone-800 dark:hover:bg-sky-500 disabled:opacity-50 transition-colors"
          >
            I&apos;m interested — Register
          </button>
        )}

        {registered && !checkedIn && checkinIsOpen && !isFull && (
          <button
            onClick={() => post(`/api/events/${eventId}/checkin`, { checkedIn: true })}
            disabled={busy}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-green-500 disabled:opacity-50 transition-colors"
          >
            ✓ Check in
          </button>
        )}

        {registered && checkedIn && (
          <button
            onClick={() => post(`/api/events/${eventId}/checkin`, { checkedIn: false })}
            disabled={busy}
            className="flex-1 py-3 bg-surface-alt text-text rounded-xl font-semibold text-sm hover:bg-border-light dark:hover:bg-border disabled:opacity-50 transition-colors"
          >
            Undo check-in
          </button>
        )}

        {registered && !checkedIn && (
          <button
            onClick={() => post(`/api/events/${eventId}/register`, { withdraw: true })}
            disabled={busy}
            className="py-3 px-4 bg-surface-alt text-red-600 dark:text-red-400 rounded-xl font-semibold text-sm hover:bg-border-light dark:hover:bg-border disabled:opacity-50 transition-colors"
          >
            Withdraw
          </button>
        )}
      </div>

      {registered && !checkedIn && !checkinIsOpen && (
        <p className="text-xs text-muted-light px-1">You&apos;re registered{waitlisted ? " (waitlist)" : ""}. Check-in hasn&apos;t opened yet.</p>
      )}
      {registered && !checkedIn && checkinIsOpen && isFull && (
        <p className="text-xs text-amber-600 dark:text-amber-400 px-1">Event is currently full — you can check in if a spot frees up.</p>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400 px-1">{error}</p>}
    </div>
  );
}
