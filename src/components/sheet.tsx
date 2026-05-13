"use client";

import { Backdrop, useEscape, useScrollLock } from "@/components/overlay";

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEscape(open, onClose);
  useScrollLock(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <Backdrop onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="drawer-panel relative w-full rounded-t-lg border-t border-line bg-surface shadow-[var(--sh-lg)] sm:max-w-md sm:rounded-lg sm:border"
          style={{ animationName: "drawer-up" }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="t-h1 truncate text-ink">{title}</h2>
              {description && (
                <p className="mt-1 t-small text-ink-3">{description}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
            {children}
          </div>
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
