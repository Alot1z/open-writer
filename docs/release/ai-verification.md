# AI — Verification Record (Phase 7)

Verified: **2026-08-17** · Branch `main` · Commit (this commit)

## 1. Headless suite — 55/55 pass

```
node scripts/mock-openai.mjs 9911 &   # OpenAI-compatible mock (chat + SSE + models + Ollama tags)
bun scripts/test-ai.ts
```

| Section | Checks |
|---|---|
| Tiny AI | 24 checks: scene classification (dialogue/action), metadata (word/sentence counts, name mentions), tags (dragon/ashfall, stopwords excluded), fuzzy entity match, duplicate detection, edit distance, similarity normalization, all 5 proofread rule types, continuity (repeated sentence, unknown entity "The Black Spire"), reranking, extractive summary |
| Agent executor | 13 checks: plan generation, progress reporting, completion, tool calls recorded, observations, artifact, result composed, read-only blocks write tools, failing tool recorded without failing the run, write allowed under full-access, write blocked under suggest, cancellation, LLM compose cascade |
| OpenAI-compatible contract | 12 checks: Ollama `/api/tags` + OpenAI `/v1/models` model listing, detectAI (bare base, `/v1`-suffixed base, unreachable host → `none`, never throws), JSON chat, SSE streaming (content + `[DONE]` + equals non-stream content), 400 on invalid request |

## 2. Browser verification (real UI, static build at `/open-writer/`)

**Agent panel (AI Agent rail):**
- Provider badge now shows the **actual provider** ("Custom" with a custom
  endpoint configured — previously every non-"none" provider displayed as
  "Z.ai").
- **Agent Tasks**: entered `Check continuity and report project health`,
  Run → task rendered the full view: **Plan (4 steps)** with checkmarks,
  **Tool Calls (6)** — `stats` → "28 chapters, 253 scenes, 351586 words",
  `chapter_overview`, `cast`, `search`, `continuity`, `read_scenes` — plus
  Observations, **agent-report artifact**, and the composed Result. Status
  `Completed`, permission `suggest`.
- **Tiny AI — no model needed**: Proofread found 50 issues (repeated
  "the" in the test corpus); the 6 tool buttons all hit
  `/api/ai/tiny/analyze` (200 for proofread/tags/classify/continuity/
  summary/duplicates — all verified earlier at the router level).

**Settings → AI:**
- Provider select: None / Z.ai / **Ollama (Local)** / Custom; model, base
  URL, API key, temperature, **Context Scope** (now 7 options incl.
  Project Summary, Related Entities, Timeline, Custom with a custom-context
  textarea), Permission Level.
- **Detect models** button: with base URL `http://127.0.0.1:9911/v1`
  (settings-style `/v1` suffix) → **"Local AI detected — Ollama · 2 models
  (mock-llama-3.1-8b, mock-qwen-2.5-7b)"** and the model field auto-filled.

**Chat + streaming through the app's router:**
- `POST /api/ai/chat` and `POST /api/ai/stream` against the mock returned
  real content; the agent's LLM compose cascade produced the report via
  the mock and recorded no errors.

## 3. Bugs found & fixed during verification

| Bug | Impact | Fix |
|---|---|---|
| **Fetch shim hijacked external `/api/*` URLs** | Ollama detection and any external endpoint whose path starts with `/api/` (e.g. `https://api.z.ai/api/v1/…`) silently routed to the local router instead of the network | Only same-origin requests are intercepted; absolute URLs to other origins always pass through (`router.ts`) |
| **`detectAI` double `/v1` suffix** | With the settings-default base URL (`…/v1`), probing built `…/v1/v1/models` → detection always failed | Try candidate roots: `/api/tags` on the `/v1`-stripped root, `/models` on the bare base and `/v1` root |
| **Empty agent result when AI unconfigured** | `compose` returned `""` when no provider was configured and the executor shipped it as the result | Empty compose falls back to the deterministic report |
| Provider badge mislabeled | Agent panel showed "Z.ai" for Ollama/custom | `use-ai-assistant` exposes the real provider; `PROVIDER_NAMES` covers ollama/custom |

## 4. Regression status

- `bun scripts/test-sync.ts` → **30 passed, 0 failed** (GitHub storage
  unaffected by the fetch-shim change)
- `bunx tsc --noEmit` → clean; `bunx eslint src` → clean
- Production static build (`NEXT_PUBLIC_BASE_PATH=/open-writer`) → clean,
  SW regenerated (53 precache entries)

## 5. Hardware posture

No GPU required. The deterministic + tiny-AI layers run everywhere; local
models are the user's choice (Ollama recommends the smallest usable model;
detection lists available models before any download). Remote providers are
opt-in.

## Result

**All Phase 7 checks pass.** Providers (none/Ollama/LM Studio/OpenAI-
compatible/Z.ai/custom) share one client; Ollama detection + model
discovery work live; chat and SSE streaming verified; the agent is a real
deterministic tool-runner with plan/tool-calls/permission-gating/
cancellation/artifacts and an LLM cascade; Tiny AI delivers
classification, tagging, metadata, entity matching, duplicate detection,
proofreading, continuity, reranking and summarization with no model; and
the three verification-found bugs (fetch-shim boundary, `/v1` detection,
empty compose) are fixed with regression tests.
