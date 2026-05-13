"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { Backdrop, useEscape } from "@/components/overlay";
import { placeholderProjects } from "@/lib/placeholder-data";
import { relativeDate } from "@/lib/format";

export function ProjectSwitcher() {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeId, setActiveId] = useState(placeholderProjects[0]?.id);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const active =
    placeholderProjects.find((p) => p.id === activeId) ??
    placeholderProjects[0];

  useEscape(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 items-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-3 py-1.5 text-left text-[13px] text-ink hover:bg-surface-3"
      >
        <span className="t-micro hidden text-ink-3 sm:inline">Project</span>
        <span className="truncate font-medium">{active?.name}</span>
        <span aria-hidden className="text-ink-3">
          ▾
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30 sm:hidden">
            <Backdrop onClick={() => setOpen(false)} />
          </div>
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Switch project"
            className="popover-panel fixed inset-x-4 top-16 z-50 max-h-[80vh] overflow-hidden rounded-md border border-line-2 bg-surface shadow-[var(--sh-lg)] sm:absolute sm:inset-x-auto sm:left-4 sm:top-12 sm:w-[320px] lg:left-auto lg:right-auto"
            style={{ transformOrigin: "top left" }}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <div className="t-micro text-ink-3">Projects</div>
                <div className="t-h2 text-ink">{placeholderProjects.length} active</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowCreate(true);
                }}
                className="rounded-sm bg-accent px-3 py-1.5 text-[12px] font-semibold text-[#0A0A0A] hover:bg-accent-dim"
              >
                + New
              </button>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {placeholderProjects.map((p) => {
                const isActive = p.id === activeId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(p.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-[120ms] ${
                        isActive
                          ? "bg-accent-soft"
                          : "hover:bg-surface-2"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                          isActive ? "bg-accent" : "bg-ink-4"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block t-body font-medium ${isActive ? "text-accent" : "text-ink"}`}
                        >
                          {p.name}
                        </span>
                        <span className="mt-0.5 block t-small text-ink-3">
                          <span data-numeric>{p.accountCount}</span> accounts ·
                          updated {relativeDate(p.updatedAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      <Sheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New project"
        description="Projects are workspaces. Every account, tag and report lives inside a project."
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-sm px-3 py-2 text-[13px] text-ink-2 hover:bg-surface-3 hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled
              className="rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create
            </button>
          </>
        }
      >
        <Field label="Name" placeholder="Spring Music Sponsorships" />
        <Field
          label="Description"
          placeholder="UK-focused indie music creators, 50–200k follower band."
          multiline
        />
        <p className="mt-4 t-small text-ink-3">
          Creation is disabled in preview mode. Wire to the API once the DB
          layer exists.
        </p>
      </Sheet>
    </>
  );
}

function Field({
  label,
  placeholder,
  multiline = false,
}: {
  label: string;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <label className="mb-3 block">
      <span className="t-micro mb-1.5 block text-ink-3">{label}</span>
      {multiline ? (
        <textarea
          disabled
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-sm border border-line-2 bg-surface-2 px-3 py-2 text-[14px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-70"
        />
      ) : (
        <input
          disabled
          placeholder={placeholder}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 text-[14px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-70"
        />
      )}
    </label>
  );
}
