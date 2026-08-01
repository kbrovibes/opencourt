"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconProps = { className?: string };

function EventsIcon({ className }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2.5" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="8" cy="14.5" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.5" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14.5" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18.5" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="9" cy="7" r="3" />
      <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
      <circle cx="17" cy="6.5" r="2.5" />
      <path d="M21 21v-.5a4.5 4.5 0 0 0-2.5-4.1" />
    </svg>
  );
}

function ProfileIcon({ className }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 21v-.5a7.5 7.5 0 0 1 15 0v.5" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/", label: "Events", Icon: EventsIcon, adminOnly: false },
  { href: "/users", label: "Users", Icon: UsersIcon, adminOnly: true },
  { href: "/profile", label: "Profile", Icon: ProfileIcon, adminOnly: false },
];

export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex bg-surface border-t border-border-light">
      {visibleItems.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" || pathname.startsWith("/events") || pathname.startsWith("/e/") : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors active:bg-surface-alt ${
              active ? "text-sky-600 dark:text-sky-400" : "text-stone-400 dark:text-muted-light"
            }`}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
