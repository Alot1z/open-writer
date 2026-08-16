# ADR 0009 — AI architecture (optional, user-configured)

**Status:** Accepted (implemented)
**Date:** 2026-08-16

## Context

AI is a nice-to-have, not a requirement. The app must be fully functional
with AI disabled. No AI credentials may ship or be committed. Static Pages
can't run a Node SDK.

## Decision

- One thin **OpenAI-compatible client** (`src/lib/local-api/ai.ts`):
  `POST {baseUrl}/chat/completions` with a user-configured model,
  temperature, base URL, and API key (key stored only in the user's
  browser localStorage).
- Providers: `none` (default), `zai`, `ollama`, `custom` — all map to the
  same client; Ollama is `http://localhost:11434` (fully local).
- **Local-only privacy mode** (`Settings → Privacy`) blocks remote
  providers; only Ollama is allowed when enabled.
- Deterministic fallbacks everywhere (search, grammar/continuity checks,
  health) so the app works with no AI at all.

## Consequences

- ✅ No secrets in the bundle; no server; privacy-gated.
- ✅ Settings → AI fully wired (provider, model, temperature, scope,
  permission) with live runtime effect.
- ⚠️ Live inference unverified without user credentials (by design);
  the code path follows the verified OpenAI-compatible contract.
- 🔄 Browser-side inference (WebGPU/ONNX/Transformers.js) was researched
  and rejected for now (large model downloads, niche value); noted as a
  future option in the study (§6).
