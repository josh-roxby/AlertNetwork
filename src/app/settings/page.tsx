import { SettingsRow, SettingsSection } from "@/components/settings-row";

export default function SettingsPage() {
  return (
    <>
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Settings</h1>
        <p className="mt-1 t-small text-ink-3">
          Project, monitoring, team, tags and integrations. Most controls are
          stubs while auth and DB are wired up.
        </p>
      </section>

      <SettingsSection label="Project">
        <SettingsRow
          kind="value"
          label="Name"
          value="Spring Sponsor · Q2"
        />
        <SettingsRow
          kind="value"
          label="Description"
          value="UK indie music"
        />
        <SettingsRow kind="value" label="Owner" value="josh@…studios.co" />
      </SettingsSection>

      <SettingsSection label="Monitoring">
        <SettingsRow
          kind="value"
          label="Daily log time"
          subtitle="Runs every day"
          value="08:00 GMT"
        />
        <SettingsRow
          kind="value"
          label="Weekly log day"
          subtitle="Runs once a week"
          value="Mon"
        />
        <SettingsRow
          kind="value"
          label="Account limit"
          subtitle="42 of 200 used"
          value="200"
          chevron={false}
        />
      </SettingsSection>

      <SettingsSection label="Team & access">
        <SettingsRow kind="value" label="Members" value="1" />
        <SettingsRow kind="value" label="Report viewers" value="3" />
        <SettingsRow
          kind="value"
          label="Copy invite link"
          value="—"
          chevron
        />
      </SettingsSection>

      <SettingsSection label="Tags & categories">
        <div id="tags-categories-section" />
        <SettingsRow kind="value" label="Categories" value="8" />
        <SettingsRow kind="value" label="Project tags" value="14" />
      </SettingsSection>

      <SettingsSection label="Integrations">
        <SettingsRow
          kind="pill"
          label="Apify"
          subtitle="TikTok scraping"
          status="good"
          value="On"
        />
        <SettingsRow
          kind="pill"
          label="Gmail service account"
          subtitle="Report delivery"
          status="good"
          value="On"
        />
        <SettingsRow kind="toggle" label="Slack alerts" on={false} />
      </SettingsSection>

      <SettingsSection label="Danger zone">
        <SettingsRow kind="danger" label="Archive project" />
        <SettingsRow kind="danger" label="Delete project" />
      </SettingsSection>
    </>
  );
}
