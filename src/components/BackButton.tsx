import NavLink from "@/components/NavLink";

export default function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <NavLink href={href} className="inline-flex items-center gap-1 text-sm text-muted hover:text-heading transition-colors w-fit">
      <span aria-hidden>←</span> {label}
    </NavLink>
  );
}
