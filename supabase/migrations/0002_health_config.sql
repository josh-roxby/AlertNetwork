-- =====================================================================
-- 0002 — Per-project health-scoring config
--
-- Adds a JSONB column to `projects` holding the weights + targets used
-- by computeAccountHealth in src/lib/data/health.ts. When unset the
-- app falls back to baked-in defaults (equal-weighted thirds with
-- 10% ER / 7-per-week / 30-day recency targets), so existing rows
-- without a config stay scored.
--
-- Apply via the Supabase SQL editor or `supabase db push`.
-- =====================================================================

alter table public.projects
  add column if not exists health_config jsonb;

-- Document the expected shape. The app validates on write and
-- gracefully handles legacy null / partial blobs.
comment on column public.projects.health_config is
  'Per-project health-scoring config. Shape: {weights: {engagement, frequency, recency}, targets: {engagementRate, postsPerWeek, recencyDays}}. NULL = defaults from src/lib/data/health.ts.';
