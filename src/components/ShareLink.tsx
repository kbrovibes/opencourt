"use client";

import { useState } from "react";

/** Compact share chip — share sheet on mobile, clipboard fallback. */
export default function ShareLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/e/${code}`;
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
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400 text-[11px] font-semibold hover:bg-sky-200 dark:hover:bg-sky-500/25 transition-colors"
      title={`Share /e/${code}`}
    >
      {copied ? "Copied ✓" : "Share 🔗"}
    </button>
  );
}
