"use client";

import { useState } from "react";

export default function ShareLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/e/${code}`;

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button
      onClick={copy}
      className="flex items-center justify-between gap-2 mt-1 px-3 py-2 bg-surface-alt rounded-lg text-sm font-mono text-text hover:bg-border-light dark:hover:bg-border transition-colors"
      title="Share event link"
    >
      <span className="truncate">{path}</span>
      <span className="text-xs font-sans font-semibold text-sky-600 dark:text-sky-400 shrink-0">
        {copied ? "Copied ✓" : "Share 🔗"}
      </span>
    </button>
  );
}
