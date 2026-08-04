"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

interface Props {
  tabs: { key: string; label: string; content: ReactNode }[];
  initial?: string;
}

export default function EventTabs({ tabs, initial }: Props) {
  const pathname = usePathname();
  const storageKey = `oc:tab:${pathname}`;
  const [active, setActive] = useState(initial ?? tabs[0]?.key);

  // Restore the last active tab — survives refreshes and any remounts, so
  // score entry never dumps you back on the default tab.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored && tabs.some((t) => t.key === stored)) setActive(stored);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function select(key: string) {
    setActive(key);
    try {
      sessionStorage.setItem(storageKey, key);
    } catch {}
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex bg-surface-alt rounded-lg p-0.5 sticky top-14 z-30">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => select(t.key)}
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
