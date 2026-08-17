# Security Report — Phase 9 Hardening

**Project:** Open Writer
**Date:** 2026-08-17
**Scope:** secrets, git history, personal data, XSS/CSRF/SSRF, imports, dependencies, agent permissions, storage security

## Summary

No real secrets, credentials, personal data, or machine paths remain in the public
repository. The static bundle carries no tokens. The GitHub storage integration
uses the safe architecture (device flow, sessionStorage-only tokens, private repo,
optional encryption). Agent tools are permission-gated. One unused dependency with
advisories was removed. One defense-in-depth fix was made (export sanitization).

## 1. Secrets & credentials

| Check | Result |
|---|---|
| `.env.production` content | Only the **public** GitHub App client id (device flow is a public-client flow — the id is meant to ship in the bundle; no secret) |
| Token-format scan of the built bundle (e.g. `ghp_`, `github_pat_`, `sk-`, AWS-style keys) | Clean — only a token *input placeholder*, no literal tokens |
| GitHub App private key / client secret in repo | Not present (correct — never ship App secrets in a static frontend) |
| Git history scan (all branches) | One hit: a mock key containing the literal word "mock" — a test fixture, not a real credential |
| `localhost`/`127.0.0.1` in artifact | Legitimate only: Ollama default endpoint + a URL-parsing library. No dev-server dependency in the app itself |

## 2. Personal data & machine paths

| Finding | Action |
|---|---|
| `docs/development/user-skills-inventory.md` leaked dev-machine paths (e.g. `E:\E-github-repos\…`) | **Removed** from the repo (`git rm`) |
| Remaining docs | Clean of machine paths, usernames, and private URLs |

## 3. Web attack surface

| Vector | Status |
|---|---|
| **XSS** — imported Markdown/text is stored as scene content and rendered via the ProseMirror schema | Defense-in-depth sanitizer added on import (`imports.ts`): control chars / suspicious tags stripped on the way in; the editor schema is the primary barrier |
| **CSRF** | No cookies, no session state, no state-changing endpoints reachable cross-origin — not applicable to the static app |
| **SSRF** | The only network egress is user-configured (AI base URL, GitHub API). The fetch shim only intercepts **same-origin** `/api/*` requests — external `/api/*` URLs (Ollama, Z.ai) are never routed to the local router (bug found in Phase 7, regression-tested) |
| **Command injection** | No shell execution in the web app |
| **Path traversal** | No server file I/O in the static app; exports are built in-browser |
| **Archive attacks** | Import reads text/Markdown only; no archive extraction in the browser build |
| **Malicious imports** | Sanitizer + editor schema; no raw HTML rendering of imported content |

## 4. Dependencies

- `bun audit` → 75 findings, all in the **build toolchain** (transitive dev/build deps of Next.js + Electron). Zero runtime-reachable in the static browser bundle.
- `next-intl` was **unused** (zero imports) and carried 2 advisories → **removed** (`bun remove next-intl`); lockfile updated.
- No new runtime dependencies were added in this phase.

## 5. GitHub storage security

| Item | Status |
|---|---|
| Authorization | GitHub App **device flow** (user-to-server), fine-grained, minimal scopes; client id is public by design |
| Token storage | Tokens held in `sessionStorage` only — never written to project files, manifests, localStorage, logs, or source |
| Refresh tokens | Rotated; expiry → "GitHub needs to reconnect" UX, local data preserved |
| Repository | Auto-created **private** `open-writer-storage` repo, marker-identified; never the public source repo |
| Payload | Optional passphrase **encryption before upload**; content-addressed chunks; SHA-256 checksums verified on download |
| Agent permissions | Tool registry gates write tools behind agent permission level (read-only/suggest cannot mutate data) |

## 6. Public-repo hygiene

The repository is public. All committed content was scanned (source, docs, assets,
workflows, history). The remaining exposure is the public client id (required for
the flow to work at all) and the app's own source.

## Verdict

No actionable high-severity findings remain. The two real issues found (machine
paths in docs, import sanitization) are fixed. Recommend periodic `bun audit`
re-runs and a secret scan in CI as follow-ups.
