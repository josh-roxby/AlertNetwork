import { redirect } from "next/navigation";

// /projects is no longer a top-level route in mobile UI v0.4 — projects are
// switched from the drawer's project card. Redirect for any stale links.
export default function ProjectsPage() {
  redirect("/dashboard");
}
