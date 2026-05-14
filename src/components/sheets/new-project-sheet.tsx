"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";

export function NewProjectSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function close() {
    setName("");
    setDescription("");
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="New project"
      description="Projects are workspaces. Every account, tag and report lives inside a project."
      footer={
        <>
          <button
            type="button"
            onClick={close}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create
          </button>
        </>
      }
    >
      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spring Music Sponsorships"
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
      </label>
      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="UK indie music creators, 50–200k follower band."
          className="w-full resize-none rounded-sm border border-line-2 bg-surface-2 px-3 py-2 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
      </label>
      <p className="mt-2 rounded-sm border border-accent-line bg-accent-soft px-3 py-2 t-small text-accent">
        Preview only. Project creation persists once the DB layer is wired.
      </p>
    </Sheet>
  );
}
