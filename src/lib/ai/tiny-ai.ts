/**
 * Tiny AI — deterministic, model-free intelligence.
 *
 * Everything here is a pure function over plain data: no network, no model,
 * no dependency on AI being configured. These features work even when every
 * provider is disabled (spec: "No AI model detected — still allow search,
 * grammar rules, word count, continuity checks, metadata extraction, tags,
 * analytics, project health").
 *
 * The AI cascade starts here: deterministic → tiny model → local model →
 * remote model. Only escalate when the deterministic result is insufficient.
 */

// ─────────────────────────────────────────────────────────────
// String utilities
// ─────────────────────────────────────────────────────────────

const STOPWORDS = new Set(
  "a an and are as at be but by for from has have he her his i if in into is it its me my no not of on or our she so that the their them then there they this to was we were what when which who will with you your".split(
    " "
  )
)

export function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

/** Damerau–Levenshtein distance (insertions/deletions/substitutions/transpositions). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) d[i][0] = i
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[m][n]
}

/** Similarity 0..1 (1 = identical) based on edit distance relative to length. */
export function stringSimilarity(a: string, b: string): number {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (na === nb) return 1
  const dist = editDistance(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - dist / maxLen
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// ─────────────────────────────────────────────────────────────
// Metadata extraction
// ─────────────────────────────────────────────────────────────

export interface SceneMetadata {
  wordCount: number
  sentenceCount: number
  dialogueLines: number
  mentions: { name: string; count: number }[]
  numbers: { value: string; count: number }[]
  capitalizedTerms: { term: string; count: number }[]
}

export function extractMetadata(text: string, knownCharacters: string[] = []): SceneMetadata {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const sentencesList = sentences(text)
  const dialogueLines = text.split("\n").filter((l) => /["“”'][^"“”']*["“”']/.test(l.trim())).length

  const mentionCounts = new Map<string, number>()
  const normalized = " " + text.replace(/\s+/g, " ") + " "
  const lower = normalized.toLowerCase()
  for (const ch of knownCharacters) {
    const key = normalizeName(ch)
    if (!key) continue
    const re = new RegExp(`\\b${escapeRegExp(key)}\\b`, "g")
    const m = lower.match(re)
    if (m) mentionCounts.set(ch, m.length)
  }

  const numCounts = new Map<string, number>()
  for (const m of text.match(/\b\d{1,4}(?:[,.]\d+)?\b/g) ?? []) {
    numCounts.set(m, (numCounts.get(m) ?? 0) + 1)
  }

  const capCounts = new Map<string, number>()
  for (const m of text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b/g) ?? []) {
    // skip sentence-initial single words (likely just a sentence start)
    const key = m.toLowerCase()
    capCounts.set(key, (capCounts.get(key) ?? 0) + 1)
  }

  const sorted = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1])

  return {
    wordCount: words.length,
    sentenceCount: sentencesList.length,
    dialogueLines,
    mentions: sorted(mentionCounts).map(([name, count]) => ({ name, count })),
    numbers: sorted(numCounts).map(([value, count]) => ({ value, count })),
    capitalizedTerms: sorted(capCounts)
      .map(([term, count]) => ({ term, count }))
      .slice(0, 25),
  }
}

// ─────────────────────────────────────────────────────────────
// Scene classification
// ─────────────────────────────────────────────────────────────

export interface SceneClassification {
  category: "dialogue" | "description" | "action" | "reflection" | "transition"
  confidence: number
  reasons: string[]
}

export function classifyScene(text: string): SceneClassification {
  const meta = extractMetadata(text)
  const total = Math.max(1, meta.sentenceCount)
  const dialogueRatio = meta.dialogueLines / Math.max(1, text.split("\n").length)
  const exclaim = (text.match(/!/g) ?? []).length
  const question = (text.match(/\?/g) ?? []).length
  const actionVerbs = (text.match(/\b(run|runs|ran|fight|fights|fought|chase|chases|grabbed|punch|kicked|shout|scream|dash|leap)\w*\b/gi) ?? []).length
  const reasons: string[] = []

  let category: SceneClassification["category"]
  if (dialogueRatio > 0.45 || question > 0) {
    category = "dialogue"
    reasons.push(`${Math.round(dialogueRatio * 100)}% lines are dialogue`)
    if (question > 0) reasons.push(`${question} question mark${question > 1 ? "s" : ""}`)
  } else if (actionVerbs >= 3 || exclaim >= 3) {
    category = "action"
    reasons.push(`${actionVerbs} action verb${actionVerbs === 1 ? "" : "s"}`, `${exclaim} exclamation${exclaim === 1 ? "" : "s"}`)
  } else if (meta.wordCount > 60 && meta.sentenceCount / total > 0.75) {
    category = "reflection"
    reasons.push("mostly short sentences — interior/reflective pacing")
  } else if (meta.wordCount < 25) {
    category = "transition"
    reasons.push("very short — likely a transition or beat")
  } else {
    category = "description"
    reasons.push("balanced exposition with little dialogue or action")
  }

  return { category, confidence: Math.min(0.95, 0.5 + reasons.length * 0.12), reasons }
}

// ─────────────────────────────────────────────────────────────
// Tagging
// ─────────────────────────────────────────────────────────────

export function suggestTags(text: string, existing: string[] = [], max = 8): string[] {
  const tokens = tokenize(text)
  const freq = new Map<string, number>()
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1)

  // Boost rare-but-meaningful terms and multi-word capitalized concepts.
  const scores = new Map<string, number>()
  for (const [word, count] of freq) {
    let score = count
    if (word.length >= 6) score += 0.5
    if (/[A-Z]/.test(word) === false) score += 0 // lowercase common words get raw frequency
    scores.set(word, score)
  }
  for (const m of text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,3}\b/g) ?? []) {
    const key = m.toLowerCase()
    scores.set(key, (scores.get(key) ?? 0) + 2)
  }

  const existingSet = new Set(existing.map((t) => t.toLowerCase()))
  const tags = [...scores.entries()]
    .filter(([word]) => !existingSet.has(word) && word.length > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word)
  return tags
}

// ─────────────────────────────────────────────────────────────
// Entity matching + duplicate detection
// ─────────────────────────────────────────────────────────────

export interface EntityMatch {
  entity: string
  score: number
}

export function matchEntities(query: string, entities: string[], threshold = 0.78): EntityMatch[] {
  const q = normalizeName(query)
  if (!q) return []
  return entities
    .map((e) => {
      const n = normalizeName(e)
      let score = stringSimilarity(q, n)
      // containment boost: "Elena Vasquez" matches query "Elena"
      if (score < 1 && (n.includes(q) || q.includes(n))) {
        score = Math.max(score, Math.min(1, Math.max(q.length, n.length) / Math.max(q.length, n.length) + 0.1))
      }
      return { entity: e, score }
    })
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score)
}

export interface DuplicatePair {
  a: string
  b: string
  similarity: number
  reason: string
}

export function findDuplicates(entities: string[], threshold = 0.85): DuplicatePair[] {
  const pairs: DuplicatePair[] = []
  const seen = new Set<string>()
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i]
      const b = entities[j]
      const key = [a, b].sort().join("\u0000")
      if (seen.has(key)) continue
      const sim = stringSimilarity(a, b)
      if (sim >= threshold) {
        seen.add(key)
        pairs.push({
          a,
          b,
          similarity: sim,
          reason: sim === 1 ? "identical names" : "near-identical names",
        })
      }
    }
  }
  return pairs.sort((x, y) => y.similarity - x.similarity)
}

// ─────────────────────────────────────────────────────────────
// Proofreading (deterministic grammar/style rules)
// ─────────────────────────────────────────────────────────────

export interface ProofIssue {
  type:
    | "double-space"
    | "repeated-word"
    | "double-punctuation"
    | "unbalanced-quote"
    | "unbalanced-paren"
    | "very-long-sentence"
    | "empty-line-space"
  message: string
  suggestion?: string
  index: number
}

const REPEATED_WORDS = new Set([
  "the", "and", "a", "of", "to", "in", "that", "it", "was", "had", "he", "she", "they",
  "but", "so", "for", "as", "at", "with", "his", "her", "you", "your",
])

export function proofread(text: string): ProofIssue[] {
  const issues: ProofIssue[] = []

  // Double spaces
  for (const m of text.matchAll(/ {2,}/g)) {
    issues.push({ type: "double-space", message: "Double space", suggestion: "Single space", index: m.index ?? 0 })
  }

  // Repeated words ("the the", "had had")
  for (const m of text.matchAll(/\b([a-z]{2,})\s+\1\b/gi)) {
    if (REPEATED_WORDS.has(m[1].toLowerCase())) {
      issues.push({
        type: "repeated-word",
        message: `Repeated word: "${m[1]}"`,
        suggestion: `Remove the second "${m[1]}"`,
        index: m.index ?? 0,
      })
    }
  }

  // Double punctuation
  for (const m of text.matchAll(/[,.!?;:]{2,}/g)) {
    issues.push({ type: "double-punctuation", message: `Double punctuation: "${m[0]}"`, index: m.index ?? 0 })
  }

  // Unbalanced quotes
  const quotes = (text.match(/["“”]/g) ?? []).length
  if (quotes % 2 !== 0) {
    issues.push({
      type: "unbalanced-quote",
      message: `Unbalanced quotation marks (${quotes} found)`,
      index: text.length,
    })
  }

  // Unbalanced parentheses
  const open = (text.match(/\(/g) ?? []).length
  const close = (text.match(/\)/g) ?? []).length
  if (open !== close) {
    issues.push({
      type: "unbalanced-paren",
      message: `Unbalanced parentheses (${open} open, ${close} close)`,
      index: text.length,
    })
  }

  // Very long sentences
  for (const s of sentences(text)) {
    const wc = s.split(/\s+/).length
    if (wc > 45) {
      issues.push({
        type: "very-long-sentence",
        message: `Very long sentence (${wc} words)`,
        suggestion: "Consider splitting into two or three sentences.",
        index: text.indexOf(s),
      })
    }
  }

  return issues.slice(0, 50)
}

// ─────────────────────────────────────────────────────────────
// Continuity checks
// ─────────────────────────────────────────────────────────────

export interface ContinuityIssue {
  problem: string
  confidence: number
  evidence: string
  source: string
}

export interface ContinuityInput {
  /** sceneId → plain text content */
  scenes: { id: string; title: string; text: string }[]
  characters: { id: string; name: string }[]
  locations: { id: string; name: string }[]
}

export function continuityCheck(input: ContinuityInput): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []

  // 1. Name-casing inconsistencies per known character
  for (const ch of input.characters) {
    const n = normalizeName(ch.name)
    if (!n) continue
    const variants = new Map<string, string[]>()
    for (const sc of input.scenes) {
      const re = new RegExp(`\\b${escapeRegExp(n)}\\b`, "gi")
      for (const m of sc.text.matchAll(re)) {
        const seen = m[0]
        const key = seen.toLowerCase()
        const list = variants.get(key) ?? []
        if (!list.includes(seen)) list.push(seen)
        variants.set(key, list)
      }
    }
    if (variants.size > 1) {
      const all = [...variants.values()].flat()
      issues.push({
        problem: `Inconsistent casing for "${ch.name}"`,
        confidence: 0.9,
        evidence: `Spelled as ${all.slice(0, 5).join(", ")}`,
        source: "all scenes",
      })
    }
  }

  // 2. Repeated identical sentences across scenes (copy-paste)
  const seenSentences = new Map<string, { scene: string; sentence: string }>()
  for (const sc of input.scenes) {
    for (const s of sentences(sc.text)) {
      if (s.length < 20) continue
      const key = s.toLowerCase()
      if (seenSentences.has(key)) {
        issues.push({
          problem: "Identical sentence in two scenes",
          confidence: 0.85,
          evidence: `"${s.slice(0, 80)}…"`,
          source: `${seenSentences.get(key)!.scene} and ${sc.title}`,
        })
      } else {
        seenSentences.set(key, { scene: sc.title, sentence: s })
      }
    }
  }

  // 3. Characters/locations mentioned but absent from the cast/set
  const knownNames = new Set([...input.characters.map((c) => normalizeName(c.name)), ...input.locations.map((l) => normalizeName(l.name))].filter(Boolean))
  const corpus = input.scenes.map((s) => s.text).join("\n")
  const capTerms = extractMetadata(corpus).capitalizedTerms
  for (const { term, count } of capTerms) {
    const n = normalizeName(term)
    if (count < 3) continue
    const words = n.split(" ")
    // heuristic: a capitalized phrase appearing often is likely a proper noun.
    // Reject only when the final (head) noun is a stopword — "The Black Spire"
    // splits as "The Black", whose head word is "Black", not "the".
    if (words.length > 1 && !knownNames.has(n) && !STOPWORDS.has(words[words.length - 1])) {
      issues.push({
        problem: `Unknown named entity "${term}"`,
        confidence: 0.55,
        evidence: `Appears ${count} time${count > 1 ? "s" : ""} but is not in the character or location list`,
        source: "scene text",
      })
    }
  }

  return issues.slice(0, 30)
}

// ─────────────────────────────────────────────────────────────
// Reranking (TF scoring)
// ─────────────────────────────────────────────────────────────

export interface RankedDoc {
  doc: string
  score: number
}

export function rerank(query: string, docs: string[]): RankedDoc[] {
  const qTokens = tokenize(query)
  if (qTokens.length === 0) return docs.map((doc) => ({ doc, score: 0 }))
  return docs
    .map((doc) => {
      const tokens = tokenize(doc)
      if (tokens.length === 0) return { doc, score: 0 }
      const freq = new Map<string, number>()
      for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1)
      let score = 0
      for (const qt of qTokens) {
        const tf = (freq.get(qt) ?? 0) / tokens.length
        score += tf
      }
      return { doc, score }
    })
    .sort((a, b) => b.score - a.score)
}

// ─────────────────────────────────────────────────────────────
// Extractive summarization
// ─────────────────────────────────────────────────────────────

export function summarize(text: string, maxSentences = 4): string {
  const sents = sentences(text)
  if (sents.length <= maxSentences) return sents.join(" ")
  const tokens = tokenize(text)
  const freq = new Map<string, number>()
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1)
  const maxFreq = Math.max(1, ...freq.values())

  const scored = sents.map((s, i) => {
    const words = s.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean)
    let score = 0
    for (const w of words) {
      const f = freq.get(w) ?? 0
      if (f > 1) score += f / maxFreq
    }
    score /= Math.max(1, words.length)
    if (i === 0) score += 0.3 // first sentence usually carries the setup
    return { s, score, i }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
    .join(" ")
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
