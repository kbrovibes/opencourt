import { notFound, redirect } from "next/navigation";
import { getAuthPlayer } from "@/lib/auth";
import { getPlayer } from "@/lib/db/players";
import { getPlayerStats } from "@/lib/db/stats";
import { titleCaseName } from "@/lib/format";
import NavLink from "@/components/NavLink";
import SkillDots from "@/components/SkillDots";
import VerifiedBadge from "@/components/VerifiedBadge";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  live: "LIVE",
  completed: "done",
  cancelled: "cancelled",
  draft: "draft",
};

/** Public (any signed-in user) read-only player profile. */
export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getAuthPlayer();
  if (!viewer) redirect("/welcome");

  const p = await getPlayer(id);
  if (!p) notFound();

  const stats = await getPlayerStats(p.id);
  const name = titleCaseName(p.name);
  const initials = name
    .split(" ")
    .filter((n) => /^[a-zA-Z]/.test(n))
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
      <BackButton href="/users" label="Players" />

      {/* Identity */}
      <div className="bg-surface rounded-xl border border-border-light dark:border-border px-4 py-5 flex flex-col items-center gap-3">
        <div className={`flex items-center justify-center w-16 h-16 rounded-full ${p.is_admin ? "bg-red-600" : "bg-sky-600"} text-white text-xl font-bold`}>
          {initials}
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg font-bold text-heading flex items-center gap-1.5">
            {name}
            {p.user_id && <VerifiedBadge size={16} />}
          </span>
          <SkillDots level={p.skill_level} size="md" />
          {p.is_admin && (
            <span className="mt-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 text-[10px] font-semibold uppercase tracking-wide">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { emoji: "🏟", val: stats.tournamentsPlayed, label: "Events" },
          { emoji: "🏆", val: stats.eventsWon, label: "Titles" },
          { emoji: "🎯", val: stats.matchesPlayed, label: "Matches" },
          { emoji: "🎖", val: stats.matchesWon, label: "Wins" },
          { emoji: "📈", val: stats.matchesPlayed > 0 ? `${Math.round((stats.matchesWon / stats.matchesPlayed) * 100)}%` : "—", label: "Win rate" },
        ].map(({ emoji, val, label }) => (
          <div key={label} className="bg-surface rounded-xl border border-border-light dark:border-border py-2.5 flex flex-col items-center gap-0.5">
            <span className="text-base leading-none">{emoji}</span>
            <span className="text-base font-bold text-heading leading-none">{val}</span>
            <span className="text-[10px] font-semibold text-muted-light">{label}</span>
          </div>
        ))}
      </div>

      {/* Recent events */}
      {stats.recentEvents.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-light px-1">Recent events</span>
          <div className="bg-surface rounded-xl border border-border-light dark:border-border divide-y divide-border-light dark:divide-border">
            {stats.recentEvents.map((e) => (
              <NavLink
                key={e.id}
                href={`/events/${e.id}`}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-alt transition-colors no-underline"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-heading truncate">{e.name}</span>
                  <span className="text-[11px] text-muted-light">{e.event_date}</span>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${e.status === "live" ? "text-green-600 dark:text-green-400" : "text-muted-light"}`}>
                  {STATUS_LABEL[e.status] ?? e.status}
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
