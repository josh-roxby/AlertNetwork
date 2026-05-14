"use client";

import { AnchorScroller } from "@/components/anchor-scroller";
import { SettingsRow, SettingsSection } from "@/components/settings-row";
import { useShell, useActiveProject } from "@/components/shell-context";
import { useAuthUser } from "@/lib/use-auth-user";

export default function SettingsPage() {
  const { openSheet, categories, tags, accounts } = useShell();
  const project = useActiveProject();
  const user = useAuthUser();

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
        <SettingsRow kind="value" label="Name" value={project?.name ?? "—"} />
        <SettingsRow
          kind="value"
          label="Description"
          value={project?.description ?? "—"}
        />
        <SettingsRow kind="value" label="Owner" value={user?.email ?? "—"} />
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
          value="1"
          subtitle="Single-owner workspaces in v1."
          onClick={() => openSheet({ kind: "manageTeam" })}
        />
      </SettingsSection>

      <div id="tags-categories-section" className="scroll-mt-4" />
      <SettingsSection label="Tags & categories">
        <SettingsRow
          kind="value"
          label="Categories"
          value={categories.length.toString()}
          onClick={() => openSheet({ kind: "categories" })}
        />
        <SettingsRow
          kind="value"
          label="Project tags"
          value={tags.length.toString()}
          onClick={() => openSheet({ kind: "tags" })}
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
