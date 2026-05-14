// Shared row + view types for the Supabase data layer.
// These mirror the migration in supabase/migrations/0001_init.sql.

export type ProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  project_id: string;
  label: string;
  palette_id: string;
  created_at: string;
};

export type TagRow = {
  id: string;
  project_id: string;
  label: string;
  created_at: string;
};

export type AccountRow = {
  id: string;
  project_id: string;
  handle: string;
  display_name: string | null;
  platform: string;
  url: string;
  category_id: string | null;
  followers: number | null;
  last_logged_at: string | null;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
};

// Hydrated account used by list/detail views — joins the category row
// and the tag labels. Posts metrics (median views, engagement, etc.)
// are derived from the `posts` table once the scraper exists; until
// then the UI treats them as "no data yet".
export type AccountView = AccountRow & {
  category: CategoryRow | null;
  tagLabels: string[];
};

export type ReportRow = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  cadence: "weekly" | "monthly";
  schedule: string | null;
  scope_kind: "project" | "category" | "account";
  status: string;
  is_featured: boolean;
  password_hash: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
};
