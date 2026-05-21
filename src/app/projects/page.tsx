"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useShell, useActiveProject } from "@/components/shell-context";
import { relativeDate } from "@/lib/format";
import { IconChevronRight, IconPlus } from "@/components/icons";
import { SkeletonProjectList } from "@/components/skeletons";
import { useAuthUser } from "@/lib/use-auth-user";
import { supabaseBrowser } from "@/lib/supabase";

export default function ProjectsPage() {
  const router = useRouter();
  const {
    setActiveProjectId,
    openSheet,
    projects,
    projectsLoading,
    isSuperAdmin,
  } = useShell();
  const active = useActiveProject();
  const user = useAuthUser();

  // Resolve "owner | viewer" per project for the current user. Owner
  // comes off `projects.owner_id`; viewer rows come from
  // project_members. Both are RLS-gated so we only see what we have
  // access to anyway.
  const [viewerProjectIds, setViewerProjectIds] = useState<Set<string>>(
    new Set(),
  );
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) {
      setViewerProjectIds(new Set());
      return;
    }
    let cancelled = false;
    const supabase = supabaseBrowser();
    supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setViewerProjectIds(
          new Set((data ?? []).map((r) => r.project_id as string)),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function roleFor(projectOwnerId: string, projectId: string):
    | "owner"
    | "viewer"
    | null {
    if (user && projectOwnerId === user.id) return "owner";
    if (viewerProjectIds.has(projectId)) return "viewer";
    return null;
  }

  function switchTo(id: string) {
    setActiveProjectId(id);
    router.push("/dashboard");
  }

  if (projectsLoading) {
    return (
      <>
        <section className="mb-4">
          <h1 className="t-display-1 uppercase text-ink">Projects</h1>
        </section>
        <SkeletonProjectList count={3} />
      </>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-2 text-center">
        <span
          aria-hidden
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent"
        >
          <IconPlus />
        </span>
        <h1 className="t-display-3 uppercase text-ink">No projects yet</h1>
        <p className="mt-2 max-w-[28ch] t-body text-ink-2">
          {isSuperAdmin
            ? "A project is a workspace for monitoring a set of accounts. Create your first one to get started."
            : "You haven't been added to any projects yet. Ask the super admin to invite you."}
        </p>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => openSheet({ kind: "newProject" })}
            className="tap-btn mt-5 inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
          >
            <IconPlus stroke="#0A0A0A" />
            Add project
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <section className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="t-display-1 uppercase text-ink">Projects</h1>
          <p className="mt-1 t-small text-ink-3">
            Switch the active project. Account, report and tag scope follow
            this selection.
          </p>
        </div>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => openSheet({ kind: "newProject" })}
            className="tap-btn inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-accent px-3 py-2 t-small font-semibold text-[#0A0A0A] hover:bg-accent-dim"
          >
            <IconPlus stroke="#0A0A0A" />
            New
          </button>
        )}
      </section>

      <ul className="flex flex-col gap-2">
        {projects.map((p) => {
          const isActive = p.id === active?.id;
          const role = roleFor(p.owner_id, p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => switchTo(p.id)}
                aria-pressed={isActive}
                className={`tap-row flex w-full items-start gap-3 rounded-md border px-4 py-4 text-left transition-colors duration-[120ms] ${
                  isActive
                    ? "border-accent-line bg-accent-soft"
                    : "border-line bg-surface hover:bg-surface-2"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                    isActive ? "bg-accent" : "bg-ink-4"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={`t-h1 ${isActive ? "text-accent" : "text-ink"}`}
                    >
                      {p.name}
                    </span>
                    {role && (
                      <span
                        className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-ink-2"
                        style={{ fontSize: 10, fontWeight: 700 }}
                      >
                        {role === "owner" ? "Owner" : "Viewer"}
                      </span>
                    )}
                    {isActive && (
                      <span
                        className="t-meta text-accent"
                        style={{ fontSize: 10, letterSpacing: "0.14em" }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </span>
                  {p.description && (
                    <span className="mt-1 block t-small text-ink-2">
                      {p.description}
                    </span>
                  )}
                  <span
                    data-numeric
                    className="mt-2 flex items-center gap-2 text-ink-3"
                    style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                  >
                    <span>
                      {p.account_count ?? 0}{" "}
                      {(p.account_count ?? 0) === 1 ? "account" : "accounts"}
                    </span>
                    <span className="text-ink-4">·</span>
                    <span>Updated {relativeDate(p.updated_at)}</span>
                  </span>
                </span>
                <IconChevronRight className="mt-1 shrink-0 text-ink-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
