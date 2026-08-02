export default function Loading() {
  return (
    <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-3 animate-pulse">
      <div className="h-24 bg-surface rounded-xl border border-border-light dark:border-border" />
      <div className="h-10 bg-surface rounded-xl border border-border-light dark:border-border" />
      <div className="h-40 bg-surface rounded-xl border border-border-light dark:border-border" />
    </div>
  );
}
