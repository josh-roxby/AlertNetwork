"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/sheet";
import { useShell, useActiveProject } from "@/components/shell-context";
import { updateProject } from "@/lib/data/projects";
import { DEFAULT_HEALTH_CONFIG, resolveHealthConfig } from "@/lib/data/health";
import type { HealthConfig } from "@/lib/data/types";

export function ManageProjectSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { refreshProjects } = useShell();
  const project = useActiveProject();

  const initialConfig = useMemo(
    () => resolveHealthConfig(project?.health_config ?? null),
    [project?.health_config],
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<HealthConfig>(initialConfig);
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "done">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  // Re-seed form state whenever the active project (or the sheet)
  // changes. Sync to a server-derived source — cascading state is
  // intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? "");
    setConfig(resolveHealthConfig(project.health_config));
    setStatus("idle");
    setErrorMessage("");
  }, [project, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function close() {
    setStatus("idle");
    setErrorMessage("");
    onClose();
  }

  function setWeight(key: keyof HealthConfig["weights"], value: number) {
    setConfig({ ...config, weights: { ...config.weights, [key]: value } });
  }

  function setTarget(key: keyof HealthConfig["targets"], value: number) {
    setConfig({ ...config, targets: { ...config.targets, [key]: value } });
  }

  function resetDefaults() {
    setConfig(DEFAULT_HEALTH_CONFIG);
  }

  async function save() {
    if (!project) return;
    if (!name.trim()) {
      setStatus("error");
      setErrorMessage("Project name can't be empty.");
      return;
    }
    setStatus("saving");
    setErrorMessage("");
    try {
      await updateProject(project.id, {
        name,
        description,
        health_config: config,
      });
      await refreshProjects();
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Couldn't save the project.",
      );
    }
  }

  const busy = status === "saving";
  const weightTotal =
    config.weights.engagement + config.weights.frequency + config.weights.recency;
  const dirty =
    !!project &&
    (name !== project.name ||
      (description || null) !== (project.description ?? null) ||
      JSON.stringify(config) !==
        JSON.stringify(resolveHealthConfig(project.health_config)));

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Project settings"
      description={
        project
          ? `${project.name} — name, description, and health scoring.`
          : "Pick an active project first."
      }
      footer={
        <>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-60"
          >
            Close
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || busy || !project}
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      {!project ? (
        <p className="t-body text-ink-3">No active project.</p>
      ) : (
        <>
          <section className="mb-5">
            <h3 className="t-micro mb-2 text-ink-3">Project</h3>
            <label className="mb-3 block">
              <span className="t-micro mb-1.5 block text-ink-3">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="t-micro mb-1.5 block text-ink-3">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                disabled={busy}
                className="w-full resize-none rounded-sm border border-line-2 bg-surface-2 px-3 py-2 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
              />
            </label>
          </section>

          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="t-micro text-ink-3">Health scoring</h3>
              <button
                type="button"
                onClick={resetDefaults}
                disabled={busy}
                className="tap-btn t-micro text-ink-3 hover:text-ink disabled:opacity-60"
                style={{ fontSize: 10 }}
              >
                Reset to defaults
              </button>
            </div>
            <p className="mb-3 t-small text-ink-3">
              Health is the weighted average of three 0-100 sub-scores. Each
              sub-score compares the live value to a target — hit the target
              and you score 100 on that axis.
            </p>

            <div className="mb-2 t-micro text-ink-3">
              Weights{" "}
              <span
                className="text-ink-4"
                style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              >
                (sum normalises automatically — currently {weightTotal})
              </span>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <WeightInput
                label="Engagement"
                value={config.weights.engagement}
                onChange={(v) => setWeight("engagement", v)}
                disabled={busy}
              />
              <WeightInput
                label="Frequency"
                value={config.weights.frequency}
                onChange={(v) => setWeight("frequency", v)}
                disabled={busy}
              />
              <WeightInput
                label="Recency"
                value={config.weights.recency}
                onChange={(v) => setWeight("recency", v)}
                disabled={busy}
              />
            </div>

            <div className="mb-2 t-micro text-ink-3">
              Targets{" "}
              <span
                className="text-ink-4"
                style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              >
                (hit = 100, miss = 0)
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <TargetInput
                label="Engagement rate"
                hint="ER that scores 100. Default 10%."
                value={config.targets.engagementRate * 100}
                onChange={(v) => setTarget("engagementRate", v / 100)}
                suffix="%"
                step={0.5}
                disabled={busy}
              />
              <TargetInput
                label="Posts per week"
                hint="Cadence that scores 100. Default 7 (daily)."
                value={config.targets.postsPerWeek}
                onChange={(v) => setTarget("postsPerWeek", v)}
                suffix="/wk"
                step={0.5}
                disabled={busy}
              />
              <TargetInput
                label="Recency window"
                hint="Days back to keep recency above 0. Default 30."
                value={config.targets.recencyDays}
                onChange={(v) => setTarget("recencyDays", v)}
                suffix="d"
                step={1}
                disabled={busy}
              />
            </div>
          </section>

          {status === "done" && !dirty && (
            <p className="rounded-sm border border-good bg-good-soft px-3 py-2 t-small text-good">
              Saved. Health scores across the app refresh on the next data load.
            </p>
          )}
          {status === "error" && errorMessage && (
            <p
              className="rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

function WeightInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="t-meta mb-1 block text-ink-3" style={{ fontSize: 10 }}>
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        step={1}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink focus:border-accent focus:outline-none disabled:opacity-60"
        data-numeric
      />
    </label>
  );
}

function TargetInput({
  label,
  hint,
  value,
  onChange,
  suffix,
  step,
  disabled,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="t-meta mb-1 block text-ink-3" style={{ fontSize: 10 }}>
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step ?? 1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 pr-9 t-body text-ink focus:border-accent focus:outline-none disabled:opacity-60"
          data-numeric
        />
        {suffix && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
            style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          >
            {suffix}
          </span>
        )}
      </div>
      <span
        className="mt-1 block t-meta text-ink-4"
        style={{ fontSize: 10 }}
      >
        {hint}
      </span>
    </label>
  );
}
