# Development Environment

Recorded 2026-08-16 by the autonomous engineering agent.

## Local machine (where this migration was performed)

| Item | Value |
| ---- | ----- |
| OS | Windows 10 (build 19045), Git Bash (MINGW64) |
| Shell | bash (Git for Windows 2.53.0) |
| Node.js | v26.5.0 |
| npm | 11.18.0 |
| Bun | 1.3.14 |
| Git | 2.53.0.windows.1 |
| Package manager | **Bun** (bun.lock; CI uses bun) |
| Editor tooling | Freebuff agent (Buffy) |

## Project

- Local path: `E:\E-github-repos\open-writer`
- GitHub: https://github.com/Alot1z/open-writer (public, branch `main`)

## Build & verify commands

```bash
bun install                 # install deps
bunx tsc --noEmit           # strict typecheck (must be clean)
bun run lint                # eslint
NEXT_PUBLIC_BASE_PATH=/open-writer bun run build   # static export → out/
node scripts/serve-out.mjs 8791   # serve out/ under /open-writer/ for testing
```

Note: on Git Bash, prefix `MSYS_NO_PATHCONV=1` when passing
`NEXT_PUBLIC_BASE_PATH=/open-writer` as an env var, otherwise Git Bash
mangles `/open-writer` into a Windows path.

## CI (GitHub Actions, ubuntu-latest)

- `ci.yml`: typecheck → lint → static export build → artifact validation → `bun audit`
- `deploy-pages.yml`: static export build with `NEXT_PUBLIC_BASE_PATH=/open-writer`
  → validate artifact → `upload-pages-artifact` (path `./out`) → deploy

## Browser verification tooling

The static export was verified in a real browser via the Freebuff preview
(Chromium via CDP): full vertical slice (project → chapter → scene →
write → autosave → reload → persist), search, exports (MD/JSON/DOCX/EPUB),
backup create/restore/delete, zero console errors.

## RavelScope (available, not coupled)

`E:\E-github-repos\RavelScope` is a Python research/engineering toolkit
that exists on this machine. It was inspected; it is **development-only
infrastructure** and has **zero runtime coupling** to Open Writer. Open
Writer builds and runs without it. See `docs/research/ravelscope.md`.
