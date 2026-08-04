import type { MatchFormat } from "@/lib/db/events";

export const FORMAT_OPTIONS: { value: MatchFormat; label: string; hint: string }[] = [
  { value: "groups", label: "Groups + knockout", hint: "FIFA style — groups feed a knockout; top 2 per group advance" },
  { value: "fixed_rounds", label: "Fixed rounds", hint: "Everyone plays the same number of matches; playoffs optional" },
  { value: "round_robin", label: "Round robin", hint: "Every team plays every other team (one big group)" },
  { value: "single_elim", label: "Single elimination", hint: "Pure knockout — fairest with 4, 8 or 16 teams" },
  { value: "manual", label: "Manual", hint: "Create each team-vs-team match yourself" },
];

export const FORMAT_LABEL = Object.fromEntries(FORMAT_OPTIONS.map((f) => [f.value, f.label])) as Record<MatchFormat, string>;
