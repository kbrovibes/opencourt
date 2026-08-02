"use client";

interface Props {
  level: number | null;
  onChange?: (level: number) => void; // interactive when provided
  size?: "sm" | "md";
}

export default function SkillDots({ level, onChange, size = "sm" }: Props) {
  const dot = size === "sm" ? "w-2 h-2" : "w-3.5 h-3.5";
  const gap = size === "sm" ? "gap-0.5" : "gap-1.5";
  return (
    <span className={`inline-flex items-center ${gap}`} title={level ? `Skill ${level}/5` : "Skill not set"}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = level !== null && i <= level;
        const cls = `${dot} rounded-full ${filled ? "bg-sky-500" : "bg-stone-300 dark:bg-neutral-700"}`;
        return onChange ? (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`${cls} transition-transform active:scale-125`}
            aria-label={`Skill ${i}`}
          />
        ) : (
          <span key={i} className={cls} />
        );
      })}
    </span>
  );
}
