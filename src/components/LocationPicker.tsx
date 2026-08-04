"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  quickPicks: string[]; // recently used venue strings from past events
  inputClassName: string;
}

interface Suggestion {
  label: string;
}

/**
 * Venue picker: recently-used badges + address autocomplete.
 * Autocomplete uses Photon (OpenStreetMap) — keyless & CORS-friendly — biased
 * and boxed to south India. Swap the fetch for Google Places if a key shows up.
 */
export default function LocationPicker({ value, onChange, quickPicks, inputClassName }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function queryPhoton(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        // bbox = south India (lon,lat pairs); bias toward Chennai
        const url =
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
          `&limit=5&lat=13.06&lon=80.24&bbox=72,7,85,19`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const seen = new Set<string>();
        const items: Suggestion[] = [];
        for (const f of data.features ?? []) {
          const p = f.properties ?? {};
          const label = [p.name, p.street && p.name !== p.street ? p.street : null, p.city ?? p.district, p.state]
            .filter(Boolean)
            .filter((part, i, arr) => arr.indexOf(part) === i)
            .join(", ");
          if (label && !seen.has(label)) {
            seen.add(label);
            items.push({ label });
          }
        }
        setSuggestions(items);
        setOpen(items.length > 0);
      } catch {
        // autocomplete is best-effort; free-typing always works
      }
    }, 300);
  }

  return (
    <div className="flex flex-col gap-1.5" ref={boxRef}>
      {quickPicks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quickPicks.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                onChange(q);
                setOpen(false);
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                value === q
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-surface-alt text-text border-border-light dark:border-border hover:border-sky-400"
              }`}
            >
              📍 {q.length > 34 ? q.slice(0, 32) + "…" : q}
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          className={inputClassName}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            queryPhoton(e.target.value);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search venue or address…"
        />
        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-surface border border-border-light dark:border-border rounded-lg shadow-lg dark:shadow-none dark:ring-1 dark:ring-border overflow-hidden">
            {suggestions.map((sug) => (
              <button
                key={sug.label}
                type="button"
                onClick={() => {
                  onChange(sug.label);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-text hover:bg-surface-alt transition-colors border-b border-border-light dark:border-border last:border-b-0"
              >
                📍 {sug.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
