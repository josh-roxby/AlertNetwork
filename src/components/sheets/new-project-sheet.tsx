"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { useShell } from "@/components/shell-context";
import { createProject } from "@/lib/data/projects";

export function NewProjectSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { refreshProjects, setActiveProjectId } = useShell();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function close() {
    setName("");
    setDescription("");
    setStatus("idle");
    setErrorMessage("");
    onClose();
  }

  async function submit() {
    if (!name.trim()) return;
    setStatus("saving");
    setErrorMessage("");
    try {
      const project = await createProject({ name, description });
      await refreshProjects();
      setActiveProjectId(project.id);
      close();
      router.push("/dashboard");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Couldn't create the project.",
      );
    }
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
            disabled={status === "saving"}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={status === "saving" || !name.trim()}
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "saving" ? "Creating…" : "Create"}
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
          disabled={status === "saving"}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </label>
      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="UK indie music creators, 50–200k follower band."
          disabled={status === "saving"}
          className="w-full resize-none rounded-sm border border-line-2 bg-surface-2 px-3 py-2 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </label>
      <p className="t-small text-ink-3">
        Categories and tags are created inline as you add accounts.
      </p>
      {status === "error" && errorMessage && (
        <p className="mt-3 t-small text-bad" role="alert">
          {errorMessage}
        </p>
      )}
    </Sheet>
  );
}
