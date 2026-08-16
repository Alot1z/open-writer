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

## Desktop (Windows) tooling

- **Electron** 43 (dev dependency) + **electron-builder** 26
  - `bun run build:desktop` → builds `out/` then packages NSIS + portable into `dist/`
  - `electron/main.js` — loopback static server (serves `out/` at `/open-writer/`),
    tray, IPC (`ow:sync-command`, `ow:sync-status`, `ow:open-external`)
  - `electron/preload.js` — sandbox-safe `contextBridge` exposing `window.openWriter`
  - Artifacts: `Open-Writer-Setup-1.0.0-x64.exe`, `Open-Writer-Portable-1.0.0-x64.exe`
- Verified: window launch, index+assets 200, hide-to-tray keep-alive,
  second-instance re-show, silent `/S` install to `%LOCALAPPDATA%\Programs\Open Writer`

## GitHub sync tooling

- `src/lib/github-sync/` — device-flow OAuth, chunked dedup sync engine
- `scripts/mock-github.mjs` — mock GitHub server (device flow, repos, contents,
  trees, manifest conversion) for headless tests and browser verification
- `scripts/test-sync.ts` — 30-case suite (run `bun scripts/test-sync.ts` with
  the mock on port 9801)
- `scripts/register-github-app.mjs` — one-click GitHub App registrar (manifest
  flow + callback server; `NO_OPEN=1` to skip launching the browser)
- Registered app: **Open Writer Storage** (App ID `4612293`,
  Client ID `Iv23lizL3yc23wougOmX`), Device Flow enabled
- `NEXT_PUBLIC_SYNC_CLIENT_ID` ships via committed `.env.production`
  (public by design); `NEXT_PUBLIC_BASE_PATH=/open-writer` is set by CI

## Verification commands (all green at Phase 0 audit)

```bash
bunx tsc --noEmit        # 0 errors
bun run lint             # clean
MSYS_NO_PATHCONV=1 NEXT_PUBLIC_BASE_PATH=/open-writer bun run build   # static export
node scripts/mock-github.mjs 9801 &   # then:
bun scripts/test-sync.ts   # 30 passed, 0 failed
```
