import fs from "node:fs"

const CR = "\r\n"

function patch(path, pairs) {
  let src = fs.readFileSync(path, "utf8")
  const crlf = src.includes(CR)
  const norm = (s) => (crlf ? s.split("\n").join(CR) : s)
  let miss = 0
  for (const [oldS, newS] of pairs) {
    const oldN = norm(oldS)
    if (!src.includes(oldN)) {
      console.log(`MISS ${path}: ${JSON.stringify(oldN.slice(0, 90))}`)
      miss++
      continue
    }
    src = src.split(oldN).join(norm(newS))
  }
  fs.writeFileSync(path, src)
  console.log(`patched ${path}${miss ? ` (${miss} misses)` : ""}`)
}

// ── 1) services.ts: relationship name resolution + delete ──────────────
patch("src/lib/local-api/services.ts", [
  [
    "export async function listRelationships(projectId: string): Promise<Relationship[]> {\n  const all = await db.getAll<Relationship>(\"relationships\")\n  return all\n    .filter((r) => r.projectId === projectId)\n    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))\n}",
    "export async function listRelationships(projectId: string): Promise<Relationship[]> {\n  const all = await db.getAll<Relationship>(\"relationships\")\n  const [characters, locations, storyObjects, worldElements] = await Promise.all([\n    db.getAll<Character>(\"characters\"),\n    db.getAll<Location>(\"locations\"),\n    db.getAll<StoryObject>(\"storyObjects\"),\n    db.getAll<WorldElement>(\"worldElements\"),\n  ])\n  // Resolve display names for any entity id referenced by a relationship.\n  const nameById = new Map<string, string>()\n  for (const c of characters) nameById.set(c.id, c.name)\n  for (const l of locations) nameById.set(l.id, l.name)\n  for (const o of storyObjects) nameById.set(o.id, o.name)\n  for (const w of worldElements) nameById.set(w.id, w.name)\n  const display = (id: string) => nameById.get(id) ?? id\n  return all\n    .filter((r) => r.projectId === projectId)\n    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))\n    .map((r) => ({\n      ...r,\n      sourceName: display(r.sourceId),\n      targetName: display(r.targetId),\n    }))\n}\n\nexport async function deleteRelationship(id: string): Promise<boolean> {\n  const existing = await db.getById<Relationship>(\"relationships\", id)\n  if (!existing) return false\n  await db.deleteRecord(\"relationships\", id)\n  return true\n}",
  ],
])

// ── 2) router.ts: DELETE /api/relationships/:id ─────────────────────────
patch("src/lib/local-api/router.ts", [
  [
    '  { pattern: "POST /api/relationships", handler: async (ctx) => json(await s.createRelationship(ctx.body), 201) },',
    '  { pattern: "POST /api/relationships", handler: async (ctx) => json(await s.createRelationship(ctx.body), 201) },\n  { pattern: "DELETE /api/relationships/:id", handler: async (ctx) => {\n      const ok = await s.deleteRelationship(ctx.pathParams.id)\n      if (!ok) return error("Relationship not found", 404)\n      return json({ success: true })\n    } },',
  ],
])

console.log("round 1 done")
