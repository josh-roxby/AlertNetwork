-- Frozen snapshot of a report's contents at send time.
--
-- Before this migration `report_history` stored only the metadata of
-- a send (when, status, recipient count, account count). The actual
-- view-page rendering pulled live posts every time, so opening an old
-- history row showed today's numbers, not the numbers as-of-the-send.
--
-- `payload` now carries a JSON snapshot built by
-- `src/lib/data/report-snapshot.ts` at send time. When present, the
-- view page (`/reports/[id]/view?historyId=X`) renders from the
-- snapshot. Legacy rows without payload fall back to live data.
--
-- Nullable so backfilling old rows isn't required; the shape is
-- versioned via `payload->>'version'` so future migrations can
-- coexist with v1.

alter table public.report_history
  add column if not exists payload jsonb;

comment on column public.report_history.payload is
  'Frozen snapshot of the report at send time. See ReportSnapshotV1 in src/lib/data/report-snapshot.ts. NULL on legacy rows.';
