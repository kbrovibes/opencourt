"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Candidate {
  id: string;
  name: string;
  takenBy: string | null; // name of someone else they already picked
  picksMe: boolean;       // they picked me
}

interface Props {
  eventId: string;
  myPartnerId: string | null;
  candidates: Candidate[];
}

export default function PartnerPicker({ eventId, myPartnerId, candidates }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(partnerId: string | null) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${eventId}/partner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
    }
    setBusy(false);
    router.refresh();
  }

  const current = candidates.find((c) => c.id === myPartnerId);

  return (
    <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-light">My partner</span>
        {current && (
          <button
            onClick={() => pick(null)}
            disabled={busy}
            className="text-[11px] font-semibold text-red-500 dark:text-red-400 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      {current ? (
        <p className="text-sm font-medium text-heading">
          🤝 {current.name}
          {current.picksMe
            ? <span className="text-green-600 dark:text-green-400 text-xs font-semibold"> · confirmed</span>
            : <span className="text-muted-light text-xs"> · waiting for them to confirm</span>}
        </p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-muted">No other checked-in players yet.</p>
      ) : (
        <select
          disabled={busy}
          defaultValue=""
          onChange={(e) => e.target.value && pick(e.target.value)}
          className="w-full px-3 py-2.5 bg-surface-alt border border-stone-300 dark:border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="" disabled>Pick from checked-in players…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.picksMe ? " — picked you!" : c.takenBy ? ` — picked ${c.takenBy}` : ""}
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
