"use client";

import { useState, type ReactNode } from "react";

interface Props {
  tabs: { key: string; label: string; content: ReactNode }[];
  initial?: string;
}

export default function EventTabs({ tabs, initial }: Props) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex bg-surface-alt rounded-lg p-0.5 sticky top-14 z-30">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              active === t.key ? "bg-surface text-heading shadow-sm" : "text-text-light hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} className={active === t.key ? "" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
