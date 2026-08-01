"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useNavigationLoader } from "@/components/NavigationLoader";
import ThemeToggle from "@/components/ThemeToggle";

interface Props {
  name: string;
  email: string;
  isAdmin: boolean;
  version: string;
}

export default function ProfileClient({ name, email, isAdmin, version }: Props) {
  const router = useRouter();
  const { startLoading } = useNavigationLoader();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name
    .split(" ")
    .filter((n) => /^[a-zA-Z]/.test(n))
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    startLoading();
    router.push("/welcome");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Identity card */}
      <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-5 flex flex-col items-center gap-3">
        <div className={`flex items-center justify-center w-16 h-16 rounded-full ${isAdmin ? "bg-red-600" : "bg-sky-600"} text-white text-xl font-bold`}>
          {initials}
        </div>
        {editing ? (
          <form onSubmit={saveName} className="flex flex-col items-center gap-2 w-full max-w-xs">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2 bg-surface-alt border border-stone-300 dark:border-border rounded-lg text-sm text-text text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-1.5 bg-stone-900 dark:bg-sky-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => { setEditing(false); setNewName(name); }} className="px-4 py-1.5 bg-surface-alt text-text rounded-lg text-xs font-semibold">
                Cancel
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </form>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <button onClick={() => setEditing(true)} className="text-lg font-bold text-heading" title="Tap to edit name">
              {name} <span className="text-xs text-muted-light font-normal">✏️</span>
            </button>
            <span className="text-xs text-muted">{email}</span>
            {isAdmin && (
              <span className="mt-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 text-[10px] font-semibold uppercase tracking-wide">
                Admin
              </span>
            )}
          </div>
        )}
      </div>

      {/* Theme */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1">Theme</span>
        <ThemeToggle />
      </div>

      {/* Logout */}
      <button
        onClick={signOut}
        className="w-full py-3 bg-surface border border-border-light dark:border-border text-red-600 dark:text-red-400 rounded-xl font-semibold text-sm hover:bg-surface-alt transition-colors"
      >
        🚪 Log out
      </button>

      <p className="text-center text-[11px] text-muted-lighter">OpenCourt v{version}</p>
    </div>
  );
}
