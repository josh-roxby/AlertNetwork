"use client";

import { useEscape, useScrollLock } from "@/components/overlay";
import { IconClose } from "@/components/icons";

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
    <div
      className="fixed inset-0 z-[var(--z-sheet)]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="drawer-backdrop fixed inset-0 z-[var(--z-backdrop)] bg-[var(--backdrop)]"
      />
      <div className="fixed inset-x-0 bottom-0 z-[var(--z-sheet)] sm:inset-0 sm:flex sm:items-end sm:justify-center sm:p-4">
        <div
          className="sheet-panel relative flex max-h-[92dvh] w-full flex-col rounded-t-lg border-t border-line bg-bg shadow-[var(--sh-lg)] sm:max-w-md sm:rounded-lg sm:border"
        >
          <div className="sticky top-0 z-10 shrink-0 rounded-t-lg border-b border-line bg-bg">
            <div className="flex justify-center pt-2">
              <span
                aria-hidden
                className="block h-1 w-9 rounded-full bg-line-3"
              />
            </div>
            <div className="flex h-[48px] items-center justify-between gap-3 px-4">
              <div className="min-w-0">
                <h2 className="t-h1 truncate text-ink">{title}</h2>
                {description && (
                  <p className="mt-0.5 t-small truncate text-ink-3">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="tap-btn -mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <IconClose />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

          {footer && (
            <div className="sticky bottom-0 z-10 grid shrink-0 grid-cols-2 gap-3 border-t border-line bg-bg px-4 py-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
