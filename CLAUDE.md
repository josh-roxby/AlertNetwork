# CLAUDE.md

Guidance for Claude Code when working in the AlertNetwork repository.

## Branching model

- `dev` is the default branch and where day-to-day development happens. All new work should branch from `dev` and merge back into `dev`.
- `main` is the production branch. Code is promoted from `dev` to `main` when it is ready to ship.
- Do not commit directly to `main`. Promote via merge or pull request from `dev`.

## Working agreements

- Track outstanding work in `TODO.md` at the repo root.
- Keep commit messages short and descriptive; explain the "why" when it is not obvious from the diff.
- Prefer editing existing files over creating new ones unless the task requires a new file.
