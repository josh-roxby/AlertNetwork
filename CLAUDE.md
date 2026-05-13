# CLAUDE.md

Guidance for Claude Code when working in the AlertNetwork repository.

## Branching model

- `main` is the only long-lived branch. Vercel deploys directly from it.
- Day-to-day work happens on short-lived feature branches off `main`.
- Branches Claude creates use the `claude/<short-name>` prefix (required by the local git proxy).
- Pull requests target `main` directly. Squash or merge-commit, then delete the feature branch.
- Do not commit directly to `main`. All changes land via PR.

> A separate `dev` branch existed in early scaffolding to mirror a dev → main promotion flow. It was removed because Vercel auto-deploys from `main`, there is no staging environment, and the second PR per feature was pure ceremony. Re-introduce `dev` (or a `staging`/`release-*` branch) only when there is an actual buffer to maintain — multiple contributors, batched releases, or a non-prod preview env.

## Working agreements

- Track outstanding work in `TODO.md` at the repo root.
- Keep commit messages short and descriptive; explain the "why" when it is not obvious from the diff.
- Prefer editing existing files over creating new ones unless the task requires a new file.
