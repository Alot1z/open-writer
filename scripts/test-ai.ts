/**
 * Headless verification for Phase 7 — Local AI + Ollama + Tiny AI + Agent.
 *
 *   node scripts/mock-openai.mjs 9911 &     # OpenAI-compatible mock
 *   bun scripts/test-ai.ts
 *
 * Sections:
 *   1. Tiny AI (deterministic, model-free) — classification, tagging,
 *      metadata, entity matching, duplicates, proofreading, continuity,
 *      reranking, summarization.
 *   2. Agent executor — plan generation, tool calls, permission gating,
 *      retry, cancellation, artifacts, LLM compose cascade.
 *   3. OpenAI-compatible contract — model discovery (Ollama + OpenAI
 *      shapes), JSON chat, SSE streaming.
 */

// ── tiny-ai ──────────────────────────────────────────────────
import {
  classifyScene,
  continuityCheck,
  editDistance,
  extractMetadata,
  findDuplicates,
  matchEntities,
  proofread,
  rerank,
  stringSimilarity,
  suggestTags,
  summarize,
} from "../src/lib/ai/tiny-ai"

// ── agent ───────────────────────────────────────────────────
import { runAgentTask, planForGoal, type AgentTool } from "../src/lib/ai/agent"

let pass = 0
let fail = 0

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++
    console.log(`  ✅ ${name}`)
  } else {
    fail++
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

// ═════════════════════════════════════════════════════════════
console.log("=== 1. Tiny AI (deterministic, model-free) ===")

// Classification
{
  const dialogue = '“Where were you?” she asked.\n“I was at the docks.”\n“The docks? At this hour?”\n“Yes.”\nHe turned away.'
  const action = "She ran. He chased, grabbing her arm. She screamed and lashed out! He ducked! She broke free and dashed for the door!"
  const c1 = classifyScene(dialogue)
  check("dialogue-heavy scene classified as dialogue", c1.category === "dialogue", c1.category)
  check("dialogue classification has confidence", c1.confidence > 0.5, String(c1.confidence))
  const c2 = classifyScene(action)
  check("action scene classified as action", c2.category === "action", c2.category)
}

// Metadata
{
  const meta = extractMetadata("Elena walked into the Blue Anchor inn. Elena sat down. Kael followed her.", ["Elena", "Kael"])
  check("word count", meta.wordCount === 13, String(meta.wordCount))
  check("Elena mentioned twice", (meta.mentions.find((m) => m.name === "Elena")?.count ?? 0) === 2)
  check("sentence count", meta.sentenceCount === 3, String(meta.sentenceCount))
}

// Tags
{
  const tags = suggestTags("The dragon burned the village of Ashfall. The dragon was old and wise. Ashfall rebuilt with dragonstone.", [], 5)
  check("tags include dragon", tags.includes("dragon"), tags.join(","))
  check("tags include ashfall", tags.includes("ashfall"), tags.join(","))
  check("stopwords excluded from tags", !tags.includes("the"), tags.join(","))
}

// Entity matching + duplicates
{
  const m = matchEntities("Elena", ["Elena Vasquez", "Kael Draven", "Mira"], 0.7)
  check("fuzzy entity match finds Elena Vasquez", m.some((x) => x.entity === "Elena Vasquez"), JSON.stringify(m))
  const dups = findDuplicates(["Elena Vasquez", "Elena Vazquez", "Kael", "Kael Draven", "Mira"], 0.85)
  check("near-identical duplicate detected", dups.some((d) => d.a.includes("Elena") && d.b.includes("Elena")))
}

// Edit distance / similarity
{
  check("editDistance('kitten','sitting') = 3", editDistance("kitten", "sitting") === 3, String(editDistance("kitten", "sitting")))
  check("identical names → similarity 1", stringSimilarity("Elena", "Elena") === 1)
  check("normalization folds case/space", stringSimilarity("Blue Anchor", "blue anchor") === 1)
}

// Proofreading
{
  const longSentence =
    "It was a very long and winding sentence that went on and on without any real pause to give the reader a chance to breathe at all, and then it continued even further with yet another clause that made it quite difficult for anyone to follow the thread."
  const issues = proofread(`The the captain paused.  He stared at the sky!! (And at the horizon. ${longSentence} (unbalanced`)
  check("repeated word detected", issues.some((i) => i.type === "repeated-word"))
  check("double space detected", issues.some((i) => i.type === "double-space"))
  check("double punctuation detected", issues.some((i) => i.type === "double-punctuation"))
  check("unbalanced paren detected", issues.some((i) => i.type === "unbalanced-paren"))
  check("long sentence detected", issues.some((i) => i.type === "very-long-sentence"), JSON.stringify(issues.map((i) => i.type)))
}

// Continuity
{
  const issues = continuityCheck({
    scenes: [
      { id: "s1", title: "Scene One", text: "Elena walked to the docks. Elena walked to the docks again." },
      { id: "s2", title: "Scene Two", text: "Elena walked to the docks. The Black Spire loomed. The Black Spire was tall. The Black Spire hummed." },
    ],
    characters: [{ id: "c1", name: "Elena" }],
    locations: [{ id: "l1", name: "the docks" }],
  })
  check("repeated sentence flagged", issues.some((i) => i.problem.includes("Identical sentence")))
  check("unknown entity flagged", issues.some((i) => i.problem.includes("Unknown named entity")), JSON.stringify(issues.map((i) => i.problem)))
}

// Rerank + summarize
{
  const ranked = rerank("dragon gold", ["The village prospered.", "The dragon slept on gold.", "Crops grew tall."])
  check("rerank puts dragon doc first", ranked[0].doc.includes("dragon"), ranked.map((r) => r.doc).join(" | "))
  const sum = summarize("Elena opened the door. The room was dark. A candle flickered. She heard breathing. The door slammed shut behind her. She was not alone.")
  check("summary keeps first sentence", sum.includes("Elena opened the door"), sum)
  check("summary is shorter than source", sum.split(" ").length < 25, sum)
}

// ═════════════════════════════════════════════════════════════
console.log("=== 2. Agent executor ===")

const memory: Record<string, string> = {}
const readTool: AgentTool = {
  name: "stats",
  description: "stats",
  permission: "read",
  run: async () => "2 chapters, 5 scenes, 1200 words",
}
const searchTool: AgentTool = {
  name: "search",
  description: "search",
  permission: "read",
  run: async (args) => `1 match for "${args.q ?? ""}"`,
}
const writeTool: AgentTool = {
  name: "save_note",
  description: "save note",
  permission: "write",
  run: async (args) => {
    memory.note = args.content ?? ""
    return `saved note: ${(args.content ?? "").slice(0, 20)}`
  },
}
const failingTool: AgentTool = {
  name: "flaky",
  description: "flaky",
  permission: "read",
  run: async () => {
    throw new Error("boom")
  },
}

{
  const tools = { stats: readTool, health: failingTool, save_note: writeTool }
  const goal = "Give me a health report on the project"
  const plan = planForGoal(goal)
  check("plan generated for health goal", plan.length >= 3, plan.join(" | "))

  const result = await runAgentTask({
    projectId: "p1",
    goal,
    permission: "read-only",
    tools,
    onProgress: (p) => {
      check("progress reported with plan", p.plan.length > 0 && p.status !== "pending")
    },
  })
  check("read-only run completes", result.ok && result.status === "completed", result.status)
  check("tool calls recorded", result.toolCalls.length > 0, String(result.toolCalls.length))
  check("observations collected", result.observations.length > 0)
  check("artifact produced", result.artifacts.length === 1 && result.artifacts[0].name === "agent-report")
  check("result composed", result.result.length > 0)
  check("read-only blocks write tool", !result.toolCalls.some((t) => t.tool === "save_note"), result.toolCalls.map((t) => t.tool).join(","))
  check("failing tool error recorded without failing run", result.errors.some((e) => e.includes("health") || e.includes("boom")), JSON.stringify(result.errors))
}

{
  const tools = { stats: readTool, save_note: writeTool }
  const result = await runAgentTask({
    projectId: "p1",
    goal: "Save a note about the manuscript",
    permission: "full-access",
    tools,
  })
  check("write tool allowed under full-access", result.toolCalls.some((t) => t.tool === "save_note"), result.toolCalls.map((t) => t.tool).join(","))
  check("write actually happened", memory.note !== undefined)
}

{
  const tools = { stats: readTool, save_note: writeTool }
  const result = await runAgentTask({
    projectId: "p1",
    goal: "Save a note about the manuscript",
    permission: "suggest",
    tools,
  })
  check("write tool blocked under suggest", !result.toolCalls.some((t) => t.tool === "save_note"))
}

{
  const ctrl = new AbortController()
  const slowTool: AgentTool = {
    name: "save_note",
    description: "slow write",
    permission: "write",
    run: async () => {
      await new Promise((r) => setTimeout(r, 500))
      memory.note = "slow"
      return "slow result"
    },
  }
  const timer = setTimeout(() => ctrl.abort(), 50)
  const result = await runAgentTask({
    projectId: "p1",
    goal: "Save a note about the manuscript",
    permission: "full-access",
    tools: { save_note: slowTool },
    signal: ctrl.signal,
  })
  clearTimeout(timer)
  check("cancellation works", result.status === "cancelled", result.status)
}

{
  let composeCalled = false
  const result = await runAgentTask({
    projectId: "p1",
    goal: "Give me a health report",
    permission: "read-only",
    tools: { stats: readTool },
    compose: async (observations, g) => {
      composeCalled = true
      return `LLM report for ${g}: ${observations.join("; ")}`
    },
  })
  check("LLM compose cascade used", composeCalled)
  check("LLM result in final report", result.result.startsWith("LLM report"))
}

// ═════════════════════════════════════════════════════════════
console.log("=== 3. OpenAI-compatible contract (mock on 9911) ===")

const BASE = "http://127.0.0.1:9911"

async function waitForMock() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/v1/models`)
      if (res.ok) return true
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  return false
}

if (await waitForMock()) {
  // Model discovery — Ollama shape
  const tags = await fetch(`${BASE}/api/tags`)
  const tagsJson = await tags.json()
  check("Ollama /api/tags lists models", Array.isArray(tagsJson.models) && tagsJson.models.length >= 2, JSON.stringify(tagsJson))

  // Model discovery — OpenAI shape
  const models = await fetch(`${BASE}/v1/models`)
  const modelsJson = await models.json()
  check("OpenAI /v1/models lists models", Array.isArray(modelsJson.data) && modelsJson.data.length >= 2)

  // detectAI end-to-end
  const { detectAI } = await import("../src/lib/local-api/ai")
  const detection = await detectAI(BASE, 3000)
  check("detectAI identifies Ollama shape", detection.detected === "ollama" && detection.models.length >= 2, JSON.stringify(detection))
  check("detectAI returns model ids", detection.models.every((m) => m.id))
  const detectionV1 = await detectAI(`${BASE}/v1`, 3000)
  check("detectAI works with /v1-suffixed base (settings default shape)", detectionV1.detected === "ollama" && detectionV1.models.length >= 2, JSON.stringify(detectionV1))
  const detectionZai = await detectAI(`http://127.0.0.1:9999/api/v1`, 800)
  check("detectAI reports none for unreachable endpoint", detectionZai.detected === "none")
  check("detectAI never throws on dead hosts", true)

  // JSON chat
  const STREAM_MSG = "Hello"
  const chat = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "mock", messages: [{ role: "user", content: STREAM_MSG }] }),
  })
  const chatJson = await chat.json()
  check("JSON chat returns assistant content", typeof chatJson.choices?.[0]?.message?.content === "string" && chatJson.choices[0].message.content.length > 0)

  // SSE streaming (same prompt so the echoed content must match)
  const stream = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "mock", stream: true, messages: [{ role: "user", content: STREAM_MSG }] }),
  })
  const reader = stream.body?.getReader()
  const decoder = new TextDecoder()
  let full = ""
  let sawDone = false
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split("\n")) {
        const t = line.trim()
        if (!t.startsWith("data:")) continue
        const payload = t.slice(5).trim()
        if (payload === "[DONE]") {
          sawDone = true
          continue
        }
        try {
          const j = JSON.parse(payload)
          const delta = j.choices?.[0]?.delta?.content
          if (delta) full += delta
        } catch {
          // partial line
        }
      }
    }
  }
  check("SSE stream produced content", full.length > 0, full.slice(0, 60))
  check("SSE stream terminated with [DONE]", sawDone)
  check("SSE stream equals non-stream content", full === chatJson.choices[0].message.content, `${full.slice(0, 40)} vs ${chatJson.choices[0].message.content.slice(0, 40)}`)

  // Failure contract
  const bad = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json",
  })
  check("invalid request → 400", bad.status === 400)
} else {
  fail++
  console.log("  ❌ mock-openai not reachable on 9911 — start it with: node scripts/mock-openai.mjs 9911 &")
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
