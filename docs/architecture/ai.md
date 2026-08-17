# AI Architecture

Open Writer's AI layer is **optional, local-first, and privacy-respecting**.
The entire application works without any AI provider; every deterministic
feature (word counts, search, analytics, continuity, health, proofreading,
tags, classification) runs without a model. AI is an escalation layer, never
a dependency.

```
User request
   │
   ▼
deterministic tools  (always available — search, stats, health, proofread)
   ▼
Tiny AI              (heuristic analysis, model-free — classify, tag, match)
   ▼
local model          (Ollama / LM Studio — configured by the user)
   ▼
remote model         (Z.ai / custom OpenAI-compatible endpoint)
```

Only escalate when a lower layer cannot answer.

## 1. Providers

| Provider | Kind | Config (Settings → AI) | Notes |
|---|---|---|---|
| `none` | — | — | Everything works; deterministic only |
| `zai` | remote | base URL defaults to `https://api.z.ai/api/v1` | API key optional, stored only in the browser |
| `ollama` | local | base URL defaults to `http://localhost:11434/v1` | No key; data never leaves the machine |
| `custom` | remote/local | any OpenAI-compatible base URL | LM Studio, OpenAI, vLLM, etc. |

All providers share one OpenAI-compatible client
(`src/lib/local-api/ai.ts`): `POST {base}/chat/completions`. The configured
base URL may or may not end in `/v1` — the client appends
`/chat/completions` and `/models` correctly in both cases.

### Detection & model discovery

- `detectAI(baseUrl)` probes the endpoint with short timeouts and never
  throws: tries the **Ollama-native `/api/tags`** shape first, then the
  OpenAI-compatible `/v1/models` shape, across candidate roots (bare base
  and `/v1`-stripped base — so `…/v1` and `…/api/v1` configurations both
  resolve).
- Settings → AI → **Detect models** fills the model field and shows
  `Local AI detected — Ollama · N models (…)` or `AI endpoint detected`.
- Ollama's native endpoints (`/api/tags`) are reached only when the fetch
  shim lets external-origin requests through (see §5).

## 2. Tiny AI — deterministic, model-free (`src/lib/ai/tiny-ai.ts`)

Pure functions over plain data. Used by the agent tools, the agent panel's
**Tiny AI — no model needed** section, and the `/api/ai/tiny/analyze`
endpoint (kinds: `proofread`, `tags`, `classify`, `continuity`, `summary`,
`duplicates`).

| Capability | What it does |
|---|---|
| `classifyScene` | Dialogue / action / description / reflection / transition with confidence + reasons |
| `suggestTags` | Stopword-filtered frequency + rarity scoring, multi-word concepts |
| `extractMetadata` | Word/sentence/dialogue counts, name mentions, numbers, capitalized terms |
| `matchEntities` | Fuzzy name matching (normalized Damerau–Levenshtein + containment) |
| `findDuplicates` | Near-identical entity-name pairs (typos, variants) |
| `proofread` | Double spaces, repeated words, double punctuation, unbalanced quotes/parens, very long sentences |
| `continuityCheck` | Name-casing inconsistencies, identical sentences across scenes, unknown recurring named entities |
| `rerank` | TF-based query→document scoring |
| `summarize` | Extractive, position + keyword-weighted |

No network, no model, no dependency on AI configuration — satisfies the
"No AI model detected — still allow search, grammar rules, word count,
continuity checks, metadata extraction, tags, analytics, project health"
requirement.

## 3. Agent executor (`src/lib/ai/agent.ts` + `agent-tools.ts`)

The agent is a **deterministic tool runner with an optional LLM composer**:

1. **Plan** — `planForGoal(goal)` maps the goal to steps (continuity,
   synopsis, proofread, character, search, health, tags, timeline,
   save-note, default).
2. **Tools** — a registry of deterministic tools over the user's own data
   (`stats`, `chapter_overview`, `read_scenes`, `cast`, `locations`,
   `search`, `proofread`, `tags`, `continuity`, `timeline`, `notes`,
   `versions`, `backups`, `health`). Never asks a model to count words or
   verify integrity (spec §8).
3. **Execution** — each step runs its mapped tools (each tool once per
   task); every tool call, result, observation, and error is recorded into
   the task; failed tools are retried (2×) and recorded without failing the
   run.
4. **Permission gating** — `read-only` and `suggest` cannot invoke write
   tools; `write-confirm`/`full-access` can (the router currently registers
   only read tools; the policy is enforced in the executor and verified by
   tests).
5. **Cancellation** — an `AbortSignal` stops between steps and marks the
   task `cancelled`.
6. **Cascade** — if an LLM is configured, the observations are composed
   into the final report by the model; otherwise (or if composition fails
   or returns empty) a deterministic report is produced. An empty compose
   result **never** ships a blank report.
7. **Artifacts** — every task ends with an `agent-report` artifact.

The UI (agent panel → **Agent Tasks**) runs tasks through
`POST /api/agent {action: "run"}`, which creates a persisted task, executes
it against the services-backed registry, and stores the full progress — the
task view renders plan / tool calls / observations / errors / artifacts /
result, with polling until completion.

## 4. Context scopes

Only the requested scope is ever included in a prompt
(`agent-panel.getContextString`):

- **Current Scene Only** — the open scene's text
- **Current Chapter** — all scenes in the open chapter
- **Project Summary** — chapters/scenes/cast/location counts + names
- **Related Entities** — characters/locations actually mentioned in the open scene
- **Timeline** — recent timeline events with dates
- **Full Project** — chapter-by-chapter text (truncated)
- **Custom** — a user-written context block (world rules, tone, intentions…)

## 5. The fetch shim boundary (important)

The static app intercepts `fetch('/api/...')` for its local data layer.
**Only same-origin requests are intercepted** — an absolute URL to a
different origin (Ollama `http://localhost:11434/api/tags`, Z.ai
`https://api.z.ai/api/v1/...`, GitHub API) always passes through to the
real network. (Verified regression: earlier the shim hijacked any path
starting with `/api/`, which silently broke Ollama detection and any
external endpoint whose path began with `/api/`.)

## 6. Privacy

- Providers `none`/`ollama` send nothing off-device; `zai`/`custom` send
  only the context scope the user chose, to the endpoint the user
  configured.
- API keys live only in the browser's localStorage (settings), never in
  project data, backups, sync manifests, or logs.
- **Local-only mode** (Settings → Privacy) blocks remote providers
  entirely; only `ollama` remains usable.
- The agent panel shows a privacy bar: `Data sent to Z.ai` /
  `your custom AI endpoint` for remote providers, and nothing for local.
- `Show data transmission info` (Settings → Privacy) displays the exact
  context sent with each request.

## 7. Hard-coded cost guardrails

- Detection probes use short timeouts (2.5 s) and abort controllers.
- Agent tool results are truncated (12k chars for manuscript reads).
- Context scopes cap prompt size (4k–12k chars by scope).
- Every operation degrades gracefully offline / with no model.
