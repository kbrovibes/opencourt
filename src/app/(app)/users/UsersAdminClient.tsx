"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SkillDots from "@/components/SkillDots";
import { titleCaseName } from "@/lib/format";

interface EventOpt {
  id: string;
  name: string;
  event_date: string;
  status: string;
}

interface PlayerRow {
  id: string;
  name: string;
  email: string | null;
  linked: boolean;
  skill: number | null;
  isAdmin: boolean;
  disabled: boolean;
}

interface RosterRow {
  player_id: string;
  checked_in_at: string | null;
  waitlisted: boolean;
}

interface Props {
  openEvents: EventOpt[];
  selectedEventId: string | null;
  players: PlayerRow[];
  roster: RosterRow[];
  selfId: string;
}

const inputCls =
  "w-full px-3.5 py-2.5 bg-surface border border-stone-300 dark:border-border rounded-lg text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-sky-500";

function EditPanel({ player, isSelf, onDone, onError }: { player: PlayerRow; isSelf: boolean; onDone: () => void; onError: (e: string) => void }) {
  const [name, setName] = useState(player.name);
  const [email, setEmail] = useState(player.email ?? "");
  const [skill, setSkill] = useState<number | null>(player.skill);
  const [saving, setSaving] = useState(false);

  async function save(extra: Record<string, unknown> = {}) {
    setSaving(true);
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email.trim() || null, skill_level: skill, ...extra }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      onError(data.error ?? "Failed to save");
      return;
    }
    onDone();
  }

  return (
    <div className="px-4 py-3 bg-surface-alt/60 flex flex-col gap-2 border-t border-border-light dark:border-border">
      <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (links login)" />
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-muted-light">Skill</span>
        <SkillDots level={skill} onChange={setSkill} size="md" />
      </div>
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => save()}
          disabled={saving}
          className="flex-1 py-2 bg-stone-900 dark:bg-sky-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => save({ disabled: !player.disabled })}
          disabled={saving}
          className={`py-2 px-3 rounded-lg text-xs font-semibold disabled:opacity-50 ${
            player.disabled
              ? "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {player.disabled ? "Re-enable" : "Disable"}
        </button>
      </div>
      {!isSelf && (
        <button
          onClick={() => save({ is_admin: !player.isAdmin })}
          disabled={saving}
          className={`py-2 rounded-lg text-xs font-semibold disabled:opacity-50 ${
            player.isAdmin
              ? "bg-surface text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
              : "bg-surface text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800"
          }`}
        >
          {player.isAdmin ? "🚫 Revoke admin" : "🛡 Make admin"}
        </button>
      )}
    </div>
  );
}

export default function UsersAdminClient({ openEvents, selectedEventId, players, roster, selfId }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showDisabled, setShowDisabled] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const rosterMap = useMemo(() => new Map(roster.map((r) => [r.player_id, r])), [roster]);
  const disabledCount = players.filter((p) => p.disabled).length;

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = players.filter((p) => (showDisabled ? p.disabled : !p.disabled));
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      const ra = rosterMap.get(a.id);
      const rb = rosterMap.get(b.id);
      const rank = (r?: RosterRow) => (r?.checked_in_at ? 0 : r ? 1 : 2);
      return rank(ra) - rank(rb) || a.name.localeCompare(b.name);
    });
  }, [players, filter, rosterMap, showDisabled]);

  const checkedInCount = roster.filter((r) => r.checked_in_at).length;

  async function api(path: string, body: Record<string, unknown>, method = "POST") {
    setError(null);
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return null;
    }
    return res.json();
  }

  async function toggleCheckin(playerId: string, target: boolean) {
    if (!selectedEventId) return;
    setBusyId(playerId);
    await api(`/api/events/${selectedEventId}/checkin`, { playerId, checkedIn: target });
    setBusyId(null);
    router.refresh();
  }

  async function toggleRegister(playerId: string, withdraw: boolean) {
    if (!selectedEventId) return;
    setBusyId(playerId);
    await api(`/api/events/${selectedEventId}/register`, { playerId, withdraw });
    setBusyId(null);
    router.refresh();
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const res = await api("/api/players", { name: newName, email: newEmail });
    setAdding(false);
    if (res) {
      setNewName("");
      setNewEmail("");
      setShowAdd(false);
      router.refresh();
    }
  }

  async function bulkAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setBulkResult(null);
    const res = await api("/api/players/bulk", { text: bulkText });
    setAdding(false);
    if (res) {
      setBulkResult(`Created ${res.created}${res.skipped.length ? `, skipped existing: ${res.skipped.join(", ")}` : ""}`);
      setBulkText("");
      router.refresh();
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-4">
      {/* Event selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1">
          Manage check-ins for
        </label>
        <select
          value={selectedEventId ?? ""}
          onChange={(e) => router.push(e.target.value ? `/users?event=${e.target.value}` : "/users")}
          className={inputCls}
        >
          <option value="">— No event selected —</option>
          {openEvents.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.event_date}){e.status === "draft" ? " [draft]" : ""}
            </option>
          ))}
        </select>
        {selectedEventId && (
          <p className="text-[11px] text-muted-light px-1">{checkedInCount} checked in · {roster.length} registered</p>
        )}
      </div>

      {/* Add buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => { setShowAdd((v) => !v); setShowBulk(false); }}
          className="flex-1 py-2 bg-surface-alt text-text rounded-lg text-sm font-semibold hover:bg-border-light dark:hover:bg-border transition-colors"
        >
          {showAdd ? "Close" : "+ Add player"}
        </button>
        <button
          onClick={() => { setShowBulk((v) => !v); setShowAdd(false); }}
          className="flex-1 py-2 bg-surface-alt text-text rounded-lg text-sm font-semibold hover:bg-border-light dark:hover:bg-border transition-colors"
        >
          {showBulk ? "Close" : "⇪ Bulk add"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addPlayer} className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3 flex flex-col gap-2">
          <input className={inputCls} placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <input className={inputCls} type="email" placeholder="Email (optional — links their login later)" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <button type="submit" disabled={adding} className="py-2 bg-stone-900 dark:bg-sky-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            {adding ? "Adding…" : "Add player"}
          </button>
        </form>
      )}

      {showBulk && (
        <form onSubmit={bulkAdd} className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-3 flex flex-col gap-2">
          <textarea
            className={`${inputCls} min-h-28 font-mono text-xs`}
            placeholder={"One per line:\nAnand\nBhavya, bhavya@gmail.com\nChetan"}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            required
          />
          <button type="submit" disabled={adding} className="py-2 bg-stone-900 dark:bg-sky-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            {adding ? "Adding…" : "Create all"}
          </button>
          {bulkResult && <p className="text-xs text-green-600 dark:text-green-400">{bulkResult}</p>}
        </form>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Search */}
      <input
        className={inputCls}
        placeholder={`Search ${players.length - disabledCount} players…`}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {/* Player list */}
      <div className="bg-surface rounded-xl border border-border-light dark:border-border divide-y divide-border-light dark:divide-border">
        {filtered.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted">
            {showDisabled ? "No disabled players." : "No players found."}
          </p>
        )}
        {filtered.map((p) => {
          const r = rosterMap.get(p.id);
          const busy = busyId === p.id;
          return (
            <div key={p.id}>
              <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm font-medium truncate flex items-center gap-1.5 ${p.disabled ? "text-muted-light line-through" : "text-heading"}`}>
                    {titleCaseName(p.name)}
                    <SkillDots level={p.skill} />
                    {p.isAdmin && (
                      <span className="text-[9px] font-bold tracking-wider uppercase text-red-500/80 dark:text-red-400/80 no-underline">admin</span>
                    )}
                    {!p.linked && <span className="text-[10px] font-semibold text-muted-lighter uppercase no-underline">manual</span>}
                  </span>
                  {r && (
                    <span className={`text-[11px] ${r.checked_in_at ? "text-green-600 dark:text-green-400" : r.waitlisted ? "text-amber-600 dark:text-amber-400" : "text-muted-light"}`}>
                      {r.checked_in_at ? "✓ Checked in" : r.waitlisted ? "Waitlist" : "Registered"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedEventId && !p.disabled && (
                    r?.checked_in_at ? (
                      <button
                        onClick={() => toggleCheckin(p.id, false)}
                        disabled={busy}
                        className="px-3 py-1.5 bg-surface-alt text-text rounded-lg text-xs font-semibold hover:bg-border-light dark:hover:bg-border disabled:opacity-50"
                      >
                        Undo
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleCheckin(p.id, true)}
                          disabled={busy}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-500 disabled:opacity-50"
                        >
                          Check in
                        </button>
                        {r ? (
                          <button
                            onClick={() => toggleRegister(p.id, true)}
                            disabled={busy}
                            className="px-2 py-1.5 text-red-500 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-surface-alt disabled:opacity-50"
                            title="Withdraw"
                          >
                            ✕
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleRegister(p.id, false)}
                            disabled={busy}
                            className="px-2.5 py-1.5 bg-surface-alt text-text rounded-lg text-xs font-semibold hover:bg-border-light dark:hover:bg-border disabled:opacity-50"
                            title="Register without check-in"
                          >
                            Reg
                          </button>
                        )}
                      </>
                    )
                  )}
                  <button
                    onClick={() => setEditId(editId === p.id ? null : p.id)}
                    className="px-1.5 py-1.5 text-muted hover:text-heading text-sm"
                    title="Edit user"
                  >
                    ✏️
                  </button>
                </div>
              </div>
              {editId === p.id && (
                <EditPanel
                  player={p}
                  isSelf={p.id === selfId}
                  onDone={() => { setEditId(null); router.refresh(); }}
                  onError={setError}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Disabled toggle */}
      {(disabledCount > 0 || showDisabled) && (
        <button
          onClick={() => setShowDisabled((v) => !v)}
          className="text-xs text-muted-light hover:text-heading self-center"
        >
          {showDisabled ? "← Back to active players" : `Show disabled players (${disabledCount})`}
        </button>
      )}
    </div>
  );
}
