/**
 * Open Writer agent executor.
 *
 * Runs a goal through a plan of tool calls, records everything the UI's
 * task view already knows how to render (plan, tool calls, observations,
 * errors, artifacts, result), respects the permission level, supports
 * cancellation + retry, and follows the AI cascade:
 *
 *     deterministic tools (always work, no model)
 *       → tiny AI (heuristic analysis, no model)
 *       → LLM (only to compose the final report when a provider is configured)
 *
 * The executor never asks a model to count words, search, compute analytics,
 * or verify integrity — those are deterministic tools (spec §8).
 */

import type { PermissionLevel } from "./provider"

export interface AgentTool {
  name: string
  description: string
  /** "read" tools always run; "write" tools require write-confirm / full-access. */
  permission: "read" | "write"
  /** Returns a textual result string. */
  run: (args: Record<string, string>) => Promise<string>
}

export type ToolRegistry = Record<string, AgentTool>

export interface AgentRunInput {
  projectId: string
  goal: string
  permission: PermissionLevel
  tools: ToolRegistry
  /** Optional LLM composer — called with observations to synthesize the report. */
  compose?: (observations: string[], goal: string) => Promise<string>
  signal?: AbortSignal
  onProgress?: (task: AgentTaskProgress) => void
}

export interface AgentToolCall {
  tool: string
  args: string
  result: string
}

export interface AgentTaskProgress {
  status: "pending" | "planning" | "running" | "completed" | "failed" | "cancelled"
  plan: string[]
  currentStep: number
  toolCalls: AgentToolCall[]
  observations: string[]
  errors: string[]
  artifacts: { name: string; type: string; content: string }[]
  result: string
}

const WRITE_PERMISSIONS: PermissionLevel[] = ["write-confirm", "full-access"]

function canWrite(permission: PermissionLevel): boolean {
  return WRITE_PERMISSIONS.includes(permission)
}

function isCancelled(signal?: AbortSignal): boolean {
  return signal?.aborted ?? false
}

/**
 * Deterministic plan generation: maps goal keywords to tool sequences.
 * The plan is a contract the UI renders as steps; every step maps to
 * tools that exist in the registry (unknown ones are skipped safely).
 */
export function planForGoal(goal: string): string[] {
  const g = goal.toLowerCase()

  if (/(continuity|plot hole|contradiction|inconsisten)/.test(g)) {
    return ["Gather scene contents", "Gather cast and locations", "Run continuity checks", "Report findings"]
  }
  if (/(summary|synopsis|overview|recap)/.test(g)) {
    return ["Survey the project structure", "Read chapter and scene summaries", "Compose the synopsis"]
  }
  if (/(proofread|grammar|typo|edit|polish|revise)/.test(g)) {
    return ["Read scene contents", "Run deterministic proofreading rules", "Report issues and suggestions"]
  }
  if (/(character|cast|arc|protagonist|villain)/.test(g)) {
    return ["List the cast", "Find scenes that mention the key names", "Assemble the character report"]
  }
  if (/(search|find|locate|mention)/.test(g)) {
    return ["Search the project", "Collect matching passages", "Report matches"]
  }
  if (/(health|status|progress|report|audit)/.test(g)) {
    return ["Compute project stats", "Check project health", "Review backups and versions", "Compose the report"]
  }
  if (/(tag|metadata|categor|classif)/.test(g)) {
    return ["Extract metadata from scenes", "Suggest tags", "Report the classification"]
  }
  if (/(timeline|event|chronolog)/.test(g)) {
    return ["Gather timeline events", "Order and summarize the timeline", "Report"]
  }
  if (/(save|write|note)/.test(g)) {
    return ["Save the requested note", "Confirm the save", "Report the outcome"]
  }
  return ["Survey the project structure", "Inspect relevant content", "Gather evidence", "Compose the result"]
}

export interface RunAgentTaskResult extends AgentTaskProgress {
  ok: boolean
}

export async function runAgentTask(input: AgentRunInput): Promise<RunAgentTaskResult> {
  const { goal, permission, tools, compose, signal, onProgress } = input
  const plan = planForGoal(goal)

  const progress: AgentTaskProgress = {
    status: "planning",
    plan,
    currentStep: 0,
    toolCalls: [],
    observations: [],
    errors: [],
    artifacts: [],
    result: "",
  }

  const emit = () => onProgress?.({ ...progress })

  // Tools filtered by permission: write tools only for write-capable levels.
  // A blocked write tool is skipped silently (never an error) — the policy
  // is that restricted permissions simply cannot invoke write tools.
  const allowedTools = Object.fromEntries(
    Object.entries(tools).filter(([, t]) => t.permission === "read" || canWrite(permission))
  )

  try {
    for (let i = 0; i < plan.length; i++) {
      if (isCancelled(signal)) {
        progress.status = "cancelled"
        progress.errors.push("Task cancelled by the user.")
        emit()
        return { ...progress, ok: false }
      }
      progress.currentStep = i
      progress.status = "running"
      emit()

      const step = plan[i]
      const observation = await executeStep(step, allowedTools, progress, signal)
      if (observation) progress.observations.push(observation)
    }

    // Cascade: LLM compose if available, else deterministic composition.
    // An empty compose result (e.g. no provider configured) falls back to
    // the deterministic report — never ship a blank result.
    if (progress.observations.length > 0) {
      let composed = ""
      if (compose && !isCancelled(signal)) {
        try {
          composed = await compose(progress.observations, goal)
        } catch (err) {
          progress.errors.push(`LLM composition failed (${err instanceof Error ? err.message : "unknown"}) — using deterministic report.`)
        }
      }
      progress.result =
        composed && composed.trim()
          ? composed
          : deterministicReport(goal, progress.observations)
    }

    if (progress.errors.length > 0 && progress.observations.length === 0) {
      progress.status = "failed"
    } else {
      progress.status = "completed"
    }

    progress.artifacts = [
      {
        name: "agent-report",
        type: "text",
        content: progress.result || "No report produced.",
      },
    ]
    emit()
    return { ...progress, ok: progress.status === "completed" }
  } catch (err) {
    progress.status = "failed"
    progress.errors.push(err instanceof Error ? err.message : String(err))
    emit()
    return { ...progress, ok: false }
  }
}

async function executeStep(
  step: string,
  tools: ToolRegistry,
  progress: AgentTaskProgress,
  signal?: AbortSignal
): Promise<string | null> {
  // Step → tool mapping. First matching entry wins; specific patterns first.
  const stepTools: { match: RegExp; tools: string[] }[] = [
    { match: /compute project stats|project stats/i, tools: ["stats"] },
    { match: /health/i, tools: ["health", "continuity"] },
    { match: /backups and versions|backup|version/i, tools: ["backups", "versions"] },
    { match: /continuity checks|continuity/i, tools: ["continuity", "read_scenes", "cast"] },
    { match: /chapter and scene|chapter/i, tools: ["chapter_overview"] },
    { match: /read scene contents|proofread/i, tools: ["read_scenes", "proofread"] },
    { match: /cast|character/i, tools: ["cast", "search"] },
    { match: /timeline/i, tools: ["timeline"] },
    { match: /metadata|tags/i, tools: ["read_scenes", "tags"] },
    { match: /note|save/i, tools: ["save_note"] },
    { match: /search|matches|matching/i, tools: ["search"] },
    { match: /survey|inspect|gather|evidence|structure/i, tools: ["stats", "chapter_overview"] },
    { match: /compose|report|result/i, tools: [] },
  ]

  const selected = stepTools.find((s) => s.match.test(step))
  const toolNames = selected?.tools ?? []
  const observations: string[] = []

  // Run every mapped tool that exists (agent-like evidence gathering): a
  // failed tool records an error but never blocks the other tools.
  for (const name of toolNames) {
    if (isCancelled(signal)) return observations.length > 0 ? observations[observations.length - 1] : null
    if (progress.toolCalls.some((c) => c.tool === name)) continue // each tool runs once per task
    const tool = tools[name]
    if (!tool) continue // tool not in registry — skip safely
    try {
      const result = await runWithRetry(tool, {}, 2, signal)
      progress.toolCalls.push({ tool: name, args: "{}", result })
      observations.push(result)
    } catch (err) {
      progress.errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return observations.length > 0 ? observations[observations.length - 1] : null
}

async function runWithRetry(
  tool: AgentTool,
  args: Record<string, string>,
  retries: number,
  signal?: AbortSignal
): Promise<string> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (isCancelled(signal)) throw new Error("cancelled")
    try {
      return await tool.run(args)
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

function deterministicReport(goal: string, observations: string[]): string {
  const lines = [
    `Agent report for: ${goal}`,
    "",
    ...observations.map((o, i) => `${i + 1}. ${o}`),
  ]
  return lines.join("\n")
}
