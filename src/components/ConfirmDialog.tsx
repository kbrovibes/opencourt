"use client";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel, danger, busy, onConfirm, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-overlay backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xs bg-surface border border-border-light dark:border-border rounded-2xl shadow-xl dark:shadow-none dark:ring-1 dark:ring-border p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-heading">{title}</h3>
        <p className="text-sm text-text leading-relaxed">{message}</p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-surface-alt text-text hover:bg-border-light dark:hover:bg-border transition-colors disabled:opacity-50"
          >
            Keep as is
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              danger ? "bg-red-600 hover:bg-red-500" : "bg-sky-600 hover:bg-sky-500"
            }`}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
