"use client";

import { AnchorScroller } from "@/components/anchor-scroller";
import { SettingsRow, SettingsSection } from "@/components/settings-row";
import { useShell, useActiveProject } from "@/components/shell-context";
import { resolveHealthConfig } from "@/lib/data/health";
import { useAuthUser } from "@/lib/use-auth-user";

export default function SettingsPage() {
  const { openSheet, categories, tags, accounts, isOwner } = useShell();
  const project = useActiveProject();
  const user = useAuthUser();
  const healthConfig = resolveHealthConfig(project?.health_config ?? null);
  const wSum =
    healthConfig.weights.engagement +
    healthConfig.weights.frequency +
    healthConfig.weights.recency;
  const weightSummary = `${Math.round(
    (healthConfig.weights.engagement / wSum) * 100,
  )} / ${Math.round((healthConfig.weights.frequency / wSum) * 100)} / ${Math.round(
    (healthConfig.weights.recency / wSum) * 100,
  )}`;

  return (
    <>
      <AnchorScroller />
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Settings</h1>
        <p className="mt-1 t-small text-ink-3">
          Project, monitoring, team and tags. Reports + integrations land in
          a later round.
        </p>
      </section>

      <SettingsSection label="Project">
        {isOwner && (
          <SettingsRow
            kind="value"
            label="Manage project"
            subtitle="Name, description, health-score weights and targets."
            value="Edit"
            onClick={() => openSheet({ kind: "manageProject" })}
          />
        )}
        <SettingsRow kind="value" label="Name" value={project?.name ?? "—"} />
        <SettingsRow
          kind="value"
          label="Description"
          value={project?.description ?? "—"}
        />
        <SettingsRow kind="value" label="Signed in as" value={user?.email ?? "—"} />
        <SettingsRow
          kind="value"
          label="Health weights"
          subtitle="Engagement / Frequency / Recency split (normalised)."
          value={weightSummary}
          onClick={isOwner ? () => openSheet({ kind: "manageProject" }) : undefined}
        />
      </SettingsSection>

      <SettingsSection label="Monitoring">
        <SettingsRow
          kind="value"
          label="Daily scrape time"
          subtitle="Every account is scraped once a day at this time."
          value="08:00 UTC"
          chevron={false}
        />
        <SettingsRow
          kind="value"
          label="Accounts in project"
          value={accounts.length.toString()}
          chevron={false}
        />
      </SettingsSection>

      <SettingsSection label="Team & access">
        <SettingsRow
          kind="value"
          label="Members"
          value={isOwner ? "Manage" : "View"}
          subtitle={
            isOwner
              ? "Invite viewers — read-only access to dashboard, accounts and reports."
              : "You have view-only access to this project."
          }
          onClick={() => openSheet({ kind: "manageTeam" })}
        />
      </SettingsSection>

      <div id="tags-categories-section" className="scroll-mt-4" />
      <SettingsSection label="Tags & categories">
        <SettingsRow
          kind="value"
          label="Categories"
          value={categories.length.toString()}
          onClick={isOwner ? () => openSheet({ kind: "categories" }) : undefined}
        />
        <SettingsRow
          kind="value"
          label="Project tags"
          value={tags.length.toString()}
          onClick={isOwner ? () => openSheet({ kind: "tags" }) : undefined}
        />
      </SettingsSection>

      <SettingsSection label="Integrations">
        <SettingsRow
          kind="pill"
          label="Apify"
          subtitle="TikTok scraping"
          status="good"
          value="On"
        />
      </SettingsSection>
    </>
  );
}
