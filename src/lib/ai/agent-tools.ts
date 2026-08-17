/**
 * Deterministic agent tools backed by the local data layer.
 *
 * Every tool is a pure function over the user's own data — no model involved
 * (spec §8: never ask AI to count words, search, or verify integrity).
 */

import type { AgentTool, ToolRegistry } from "./agent"
import { stripHtml } from "@/lib/local-api/services"

interface ToolDeps {
  listChapters: (projectId: string) => Promise<Array<{ id: string; title: string; scenes?: Array<{ id: string; title: string; content?: string; status?: string }> }>>
  listCharacters: (projectId: string) => Promise<Array<{ id: string; name: string; role?: string }>>
  listLocations: (projectId: string) => Promise<Array<{ id: string; name: string; type?: string }>>
  listTimelineEvents: (projectId: string) => Promise<Array<{ id: string; title: string; date?: string; description?: string }>>
  listNotes: (projectId: string) => Promise<Array<{ id: string; title: string; content?: string; resolved?: boolean }>>
  listVersions: (projectId: string) => Promise<Array<{ id: string; label?: string; createdAt?: string }>>
  listBackups: (projectId: string) => Promise<Array<{ id: string; createdAt?: string; checksum?: string }>>
  listComments: (params: { projectId?: string }) => Promise<Array<{ id: string; text?: string; resolved?: boolean }>>
  search: (projectId: string, q: string) => Promise<unknown>
  health: (projectId: string) => Promise<unknown>
  continuity: (projectId: string) => Promise<unknown>
}

export function buildAgentTools(deps: ToolDeps, projectId: string): ToolRegistry {
  const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)
  const pid = projectId
  const project = () => pid

  const tools: AgentTool[] = [
    {
      name: "stats",
      permission: "read",
      description: "Project statistics: chapters, scenes, word count, statuses.",
      run: async () => {
        const chapters = await deps.listChapters(project())
        let scenes = 0
        let words = 0
        const byStatus = new Map<string, number>()
        for (const ch of chapters) {
          for (const sc of ch.scenes ?? []) {
            scenes++
            words += stripHtml(sc.content ?? "").split(/\s+/).filter(Boolean).length
            const st = sc.status || "draft"
            byStatus.set(st, (byStatus.get(st) ?? 0) + 1)
          }
        }
        const statuses = [...byStatus.entries()].map(([k, v]) => `${k}: ${v}`).join(", ")
        return `${chapters.length} chapters, ${scenes} scenes, ${words} words. Scene statuses — ${statuses || "none"}.`
      },
    },
    {
      name: "chapter_overview",
      permission: "read",
      description: "Chapter titles with scene counts and per-chapter word counts.",
      run: async () => {
        const chapters = await deps.listChapters(project())
        if (chapters.length === 0) return "No chapters yet."
        const lines = chapters.map((ch) => {
          const scs = ch.scenes ?? []
          const wc = scs.reduce((n, sc) => n + stripHtml(sc.content ?? "").split(/\s+/).filter(Boolean).length, 0)
          return `- ${ch.title || "Untitled"}: ${scs.length} scene${scs.length === 1 ? "" : "s"}, ${wc} words`
        })
        return lines.join("\n")
      },
    },
    {
      name: "read_scenes",
      permission: "read",
      description: "Concatenated manuscript text (truncated to 12k chars).",
      run: async () => {
        const chapters = await deps.listChapters(project())
        const parts: string[] = []
        for (const ch of chapters) {
          for (const sc of ch.scenes ?? []) {
            const text = stripHtml(sc.content ?? "").trim()
            if (text) parts.push(`[${ch.title} / ${sc.title}]\n${text}`)
          }
        }
        const all = parts.join("\n\n")
        return truncate(all, 12_000)
      },
    },
    {
      name: "cast",
      permission: "read",
      description: "The character cast with roles.",
      run: async () => {
        const cast = await deps.listCharacters(project())
        if (cast.length === 0) return "No characters yet."
        return cast.map((c) => `- ${c.name}${c.role ? ` (${c.role})` : ""}`).join("\n")
      },
    },
    {
      name: "locations",
      permission: "read",
      description: "The locations with types.",
      run: async () => {
        const locs = await deps.listLocations(project())
        if (locs.length === 0) return "No locations yet."
        return locs.map((l) => `- ${l.name}${l.type ? ` (${l.type})` : ""}`).join("\n")
      },
    },
    {
      name: "search",
      permission: "read",
      description: "Search the project for a term. Args: q.",
      run: async (args) => {
        const q = args.q ?? ""
        if (!q) return "No search term given."
        const res = (await deps.search(project(), q)) as { results?: Array<{ type?: string; name?: string; snippet?: string }>; count?: number }
        if (!res || !Array.isArray(res.results) || res.results.length === 0) return `No matches for "${q}".`
        return `${res.results.length} match${res.results.length === 1 ? "" : "es"} for "${q}":\n` + res.results.slice(0, 8).map((r) => `- [${r.type ?? "item"}] ${r.name ?? ""} — ${truncate(r.snippet ?? "", 100)}`).join("\n")
      },
    },
    {
      name: "proofread",
      permission: "read",
      description: "Deterministic proofreading report over the manuscript.",
      run: async () => {
        const chapters = await deps.listChapters(project())
        const text = chapters
          .flatMap((c) => c.scenes ?? [])
          .map((sc) => stripHtml(sc.content ?? ""))
          .join("\n")
        if (!text.trim()) return "No manuscript text to proofread."
        const { proofread } = await import("./tiny-ai")
        const issues = proofread(text)
        if (issues.length === 0) return "No deterministic proofreading issues found."
        return `${issues.length} issue${issues.length === 1 ? "" : "s"} found:\n` + issues.slice(0, 15).map((i) => `- ${i.message}${i.suggestion ? ` (suggest: ${i.suggestion})` : ""}`).join("\n")
      },
    },
    {
      name: "tags",
      permission: "read",
      description: "Suggested tags + metadata extracted from the manuscript.",
      run: async () => {
        const chapters = await deps.listChapters(project())
        const text = chapters
          .flatMap((c) => c.scenes ?? [])
          .map((sc) => stripHtml(sc.content ?? ""))
          .join("\n")
        const cast = await deps.listCharacters(project())
        if (!text.trim()) return "No text to analyze."
        const { suggestTags, extractMetadata } = await import("./tiny-ai")
        const meta = extractMetadata(text, cast.map((c) => c.name))
        const tags = suggestTags(text)
        return `Word count: ${meta.wordCount}. Sentence count: ${meta.sentenceCount}. Dialogue lines: ${meta.dialogueLines}. Suggested tags: ${tags.slice(0, 6).join(", ") || "none"}.`
      },
    },
    {
      name: "continuity",
      permission: "read",
      description: "Deterministic continuity check (casing, repeated sentences, unknown entities).",
      run: async () => {
        const chapters = await deps.listChapters(project())
        const scenes = chapters.flatMap((c) => (c.scenes ?? []).map((sc) => ({ id: sc.id, title: sc.title, text: stripHtml(sc.content ?? "") })))
        const cast = await deps.listCharacters(project())
        const locs = await deps.listLocations(project())
        const { continuityCheck } = await import("./tiny-ai")
        const issues = continuityCheck({ scenes, characters: cast, locations: locs })
        if (issues.length === 0) return "No continuity issues found by deterministic rules."
        return `${issues.length} potential issue${issues.length === 1 ? "" : "s"}:\n` + issues.slice(0, 10).map((i) => `- [${Math.round(i.confidence * 100)}%] ${i.problem} (${i.evidence})`).join("\n")
      },
    },
    {
      name: "timeline",
      permission: "read",
      description: "Timeline events with dates.",
      run: async () => {
        const events = await deps.listTimelineEvents(project())
        if (events.length === 0) return "No timeline events yet."
        return events.slice(0, 15).map((e) => `- ${e.date ? `[${e.date}] ` : ""}${e.title}${e.description ? ` — ${truncate(e.description, 80)}` : ""}`).join("\n")
      },
    },
    {
      name: "notes",
      permission: "read",
      description: "Project notes (unresolved first).",
      run: async () => {
        const notes = await deps.listNotes(project())
        if (notes.length === 0) return "No notes yet."
        const open = notes.filter((n) => !n.resolved)
        const list = (open.length > 0 ? open : notes).slice(0, 10)
        return list.map((n) => `- ${n.title}${n.resolved ? " (resolved)" : ""}`).join("\n")
      },
    },
    {
      name: "versions",
      permission: "read",
      description: "Manuscript versions.",
      run: async () => {
        const versions = await deps.listVersions(project())
        if (versions.length === 0) return "No versions yet."
        return versions.slice(0, 10).map((v) => `- ${v.label ?? "version"} (${v.createdAt ?? "unknown"})`).join("\n")
      },
    },
    {
      name: "backups",
      permission: "read",
      description: "Backups with checksums.",
      run: async () => {
        const backups = await deps.listBackups(project())
        if (backups.length === 0) return "No backups yet."
        return backups.slice(0, 5).map((b) => `- backup ${b.id} (${b.createdAt ?? "unknown"})${b.checksum ? ` checksum ${b.checksum.slice(0, 12)}…` : ""}`).join("\n")
      },
    },
    {
      name: "health",
      permission: "read",
      description: "Project health report.",
      run: async () => {
        const report = (await deps.health(project())) as { issues?: Array<{ severity?: string; message?: string }> }
        const issues = Array.isArray(report?.issues) ? report.issues : []
        if (issues.length === 0) return "Project health: no issues detected."
        return `${issues.length} health issue${issues.length === 1 ? "" : "s"}:\n` + issues.slice(0, 10).map((i) => `- [${i.severity ?? "info"}] ${i.message ?? ""}`).join("\n")
      },
    },
  ]

  const registry: ToolRegistry = {}
  for (const t of tools) registry[t.name] = t
  return registry
}
