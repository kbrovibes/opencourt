"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** Login link that carries the ?next= destination through to /login. */
export default function NextCarrier({ className, children }: { className?: string; children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const href = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
