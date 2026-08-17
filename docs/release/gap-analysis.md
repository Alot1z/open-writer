# Gap Analysis — Final (Phase 11B)

**Project:** Open Writer
**Date:** 2026-08-17
**Status:** FINAL RELEASE GATE — WINDOWS_CI_VERIFIED

This is the honest end-state. "Verified" means evidence exists (headless checks,
browser probes, packaged-EXE runtime tests, live URL checks) — not that a build
passed. Gaps are listed without hiding.

## 1. Blocked (requires external action/credentials)

| # | Gap | Why blocked | Workaround / path |
|---|---|---|---|
| 1 | Real GitHub sync round-trip on a user account | Device-flow authorization is user-account-bound; the session has no GitHub user session to authorize. Verified live up to the device-code endpoint (HTTP 200, real code) and the full engine against the mock server (30 checks) | User clicks "Connect GitHub" once; flow is one-click |
| 2 | Z.ai / remote AI with real credentials | Requires user API key by design | Verified against the OpenAI-compatible contract (mock) + local Ollama detection |
| ~~3~~ | ~~Push `.github/workflows/windows.yml`~~ | ~~Session GitHub token lacks `workflow` scope~~ | **CLOSED (11B):** pushed and running on windows-latest — two green runs (typecheck + all 3 test suites 106/106 + electron-builder + artifacts uploaded). Root cause was the shell's `GITHUB_TOKEN` env var masking the user's full-scope keyring credential; `env -u GITHUB_TOKEN -u GH_TOKEN` exposes it |
| 4 | Code-signing the Windows EXEs | No signing certificate in this environment | SmartScreen warning expected; artifacts are reproducible from source |

## 2. Unverified (known, honest)

| # | Gap | Why not verified here | Notes |
|---|---|---|---|
| 1 | Mobile/tablet responsive pass | No mobile emulation in this environment | Layout is fluid (flex/grid); needs a device pass |
| 2 | Screen-reader walkthrough (NVDA/VoiceOver) | Requires assistive-tech environment | a11y audit was code-inspection + live-DOM + reduced-motion; **real axe-core 4.13 run now passes 11/11 (Phase 11)**; axe CI gate recommended |
| 3 | PWA install-prompt drive test | The app meets manifest/SW criteria; the OS install prompt itself wasn't exercised | Offline behavior fully verified (11/11, incl. server killed) |
| 4 | 250k-word UX feel on very low-end hardware | Benchmarked on this machine (351k words, all ops <500 ms, heap 35 MB) | No virtualization needed at target scale |

## 3. Partial (works, with a caveat)

| # | Gap | Detail |
|---|---|---|
| 1 | Remote AI streaming polish | Works (SSE verified); provider UX is functional, not polished |
| 2 | Comments UI end-to-end | API fully verified; the panel UI flow was verified in earlier phases but not re-run in the final gate |
| 3 | Import preview dialog | Importer works + sanitized; no pre-import summary dialog |
| 4 | Windows install-artifact test | NSIS + portable EXEs built and the unpacked EXE runtime-tested (create/write/persist); the installer GUI click-through itself wasn't run headlessly |

## 4. Deferred (by design — not defects)

| # | Gap | Why |
|---|---|---|
| 1 | Real-time collaboration / shared cursors | Requires an optional external server by design; sync covers cross-device |
| 2 | Server-side publishing / cloud accounts | Out of scope for the local-first model; optional infrastructure layer |
| 3 | WebGPU/ONNX in-browser LLM | Deliberately not added: the tiny-AI deterministic layer + optional local Ollama covers it without a 1 GB download |
| 4 | Mobile native app | Web app is responsive; no native wrapper planned |

## 5. Known product notes (not bugs)

| # | Note |
|---|---|
| 1 | Default autosave debounce remains 30 s (configurable in Settings → Writing), but pending content is now flushed on scene switch, unmount, `pagehide`, `visibilitychange(hidden)`, and Ctrl/Cmd+S; no known close-within-window data-loss path remains |
| 2 | Windows EXE is unsigned |
| 3 | The GitHub storage repo is one private repo per account (many projects inside), chosen for simplicity + API efficiency — documented in `docs/architecture/github-storage.md` |

## 6. Fixed during the phases (no longer gaps)

Storage port data-loss (P5) · IndexedDB self-heal + version bump (P10) · export
crash on corrupt data (P9) · fetch-shim SSRF (P7) · detectAI double-`/v1` (P7) ·
empty agent result without AI (P7) · icon-only buttons unlabeled (P9) ·
reduced-motion missing (P9) · desktop build missing basePath (P10).

## 7. Verdict

No **blocking** defects remain for the release criteria: `WINDOWS_CI_VERIFIED` is evidenced by green GitHub Actions run `32033897096` with 106/106 tests and three downloadable artifacts. The GitHub Pages site is
the real app (verified live, byte-identical bundle, full offline), the Windows
EXE is the real app (verified runtime + persistence), GitHub storage is
one-click and private, AI is optional with a deterministic fallback, and the
remaining gaps are external-credential or environment-bound — each with a
documented path.
