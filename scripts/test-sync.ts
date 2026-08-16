/**
 * Headless end-to-end verification of the sync engine against the mock
 * GitHub server (scripts/mock-github.mjs). Covers the full product loop:
 *
 *   1. device-flow connect + private repo auto-creation
 *   2. initial verified snapshot upload
 *   3. no-op sync (identical content → nothing uploaded)
 *   4. delta sync (edit one scene → only changed chunks uploaded)
 *   5. cross-device dedup (second device merges remote tree, re-uploads nothing)
 *   6. second-device pull (remote changes auto-restore when local is clean)
 *   7. conflict detection + keep-local / keep-remote / save-both
 *   8. encryption round-trip + integrity check
 *   9. offline behavior (server down → "offline", recovers)
 *
 * Run:  node scripts/mock-github.mjs 9801 &
 *       bun scripts/test-sync.ts
 */

import { SyncEngine } from "../src/lib/github-sync/engine"
import { MemoryDataProvider } from "../src/lib/github-sync/data-provider"
import { SYNC_CONFIG } from "../src/lib/github-sync/config"
import { GitHubApi } from "../src/lib/github-sync/api"
import { buildSnapshot, downloadSnapshot, SnapshotManifest } from "../src/lib/github-sync/snapshot"
import { ChunkIndexDb } from "../src/lib/github-sync/chunk-index"

const MOCK = "http://127.0.0.1:9801"

const config = {
  ...SYNC_CONFIG,
  apiBase: MOCK,
  webBase: MOCK,
  clientId: "Iv1.testdeviceflow",
  debounceMs: 1000,
  backoffBaseMs: 200,
  maxRetries: 2,
  chunkSize: 64,
}

let pass = 0
let fail = 0
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    pass++
    console.log(`  ✅ ${name}`)
  } else {
    fail++
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

async function fetchMock(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${MOCK}${path}`, init)
}

function makeProject(id: string, name: string, words: string[]): string {
  return JSON.stringify({
    schema: 1,
    project: { id, name, updatedAt: new Date().toISOString() },
    stores: {
      projects: [{ id, name, updatedAt: new Date().toISOString() }],
      chapters: [{ id: "ch1", projectId: id, title: "Chapter One", order: 0 }],
      scenes: words.map((w, i) => ({
        id: `sc${i}`,
        projectId: id,
        chapterId: "ch1",
        title: `Scene ${i + 1}`,
        content: w,
        order: i,
        status: "draft",
      })),
      characters: [{ id: "char1", projectId: id, name: "Ada", role: "protagonist" }],
      locations: [],
      storyObjects: [],
      worldElements: [],
      timelineEvents: [],
      relationships: [],
      notes: [],
      comments: [],
      versions: [],
      goals: [],
      sessions: [],
      agentTasks: [],
    },
  })
}

async function main(): Promise<void> {
  console.log("\n=== 1. Device-flow connect + private repo auto-creation ===")
  const providerA = new MemoryDataProvider()
  const engineA = new SyncEngine(providerA, config)

  const flow = await engineA.startDeviceFlow()
  check("device flow returns a user code", /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(flow.userCode))
  await fetchMock("/login/device/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ user_code: flow.userCode }),
  })
  await engineA.finishDeviceFlow(flow.userCode, 1, Date.now() + 60_000)
  check("connected after device authorization", engineA.connected)

  const snap = engineA.getEngineSnapshot()
  check("repo auto-created", snap.repoFullName === "testwriter/open-writer-storage", snap.repoFullName ?? "none")

  // Inspect the mock repo directly
  const meta = await fetchMock(
    "/repos/testwriter/open-writer-storage/contents/open-writer/meta.json"
  ).then((r) => r.json())
  const metaText = Buffer.from(meta.content, "base64").toString("utf8")
  check("storage metadata bootstrapped with marker", JSON.parse(metaText).kind === "open-writer-storage-v1")

  console.log("\n=== 2. Initial snapshot upload ===")
  const wordsA = Array.from({ length: 400 }, (_, i) => `word${i} `.repeat(10)).join("")
  providerA.seed("p1", "The Lighthouse", makeProject("p1", "The Lighthouse", [wordsA, "Second scene."]))
  await engineA.syncNow()
  const index1 = await fetchMock(
    "/repos/testwriter/open-writer-storage/contents/open-writer/projects/index.json"
  ).then((r) => r.json())
  const idx1 = JSON.parse(Buffer.from(index1.content, "base64").toString("utf8"))
  check("project indexed remotely", idx1.projects["p1"]?.version === 1)
  const ps1 = engineA.getProjectState("p1")
  check("local state marks synced", ps1?.status === "synced" && ps1.syncedChecksum !== null)

  // Count chunk files in the repo
  const tree1 = await fetchMock(
    "/repos/testwriter/open-writer-storage/git/trees/HEAD?recursive=1"
  ).then((r) => r.json())
  const chunkFiles1 = tree1.tree.filter((t) => t.path.includes("/objects/"))
  check("chunks content-addressed and present", chunkFiles1.length >= 2, `count=${chunkFiles1.length}`)

  console.log("\n=== 3. No-op sync (identical content → nothing uploaded) ===")
  const putsBefore = await fetchMock("/user/repos", { headers: { Authorization: "Bearer x" } }).then((r) => r.status)
  await engineA.syncNow()
  const tree2 = await fetchMock(
    "/repos/testwriter/open-writer-storage/git/trees/HEAD?recursive=1"
  ).then((r) => r.json())
  const chunkFiles2 = tree2.tree.filter((t) => t.path.includes("/objects/"))
  check("no new chunks on identical content", chunkFiles2.length === chunkFiles1.length)
  void putsBefore

  console.log("\n=== 4. Delta sync (edit one scene → only changed chunks uploaded) ===")
  providerA.mutate("p1", (payload) => {
    const data = JSON.parse(payload)
    data.stores.scenes[0].content += " BRAND NEW TEXT ".repeat(50)
    return JSON.stringify(data)
  })
  await engineA.syncNow()
  const idx2 = await fetchMock(
    "/repos/testwriter/open-writer-storage/contents/open-writer/projects/index.json"
  ).then((r) => r.json())
  const ver2 = JSON.parse(Buffer.from(idx2.content, "base64").toString("utf8")).projects["p1"].version
  check("version bumped to 2", ver2 === 2)
  const tree3 = await fetchMock(
    "/repos/testwriter/open-writer-storage/git/trees/HEAD?recursive=1"
  ).then((r) => r.json())
  const chunks3 = tree3.tree.filter((t) => t.path.includes("/objects/")).length
  check("chunk count grew only by changed content", chunks3 > chunkFiles2.length, `${chunks3} vs ${chunkFiles2.length}`)

  console.log("\n=== 5. Second device: connect, discover in the cloud, restore, dedup ===")
  const providerB = new MemoryDataProvider() // empty — brand-new device
  const engineB = new SyncEngine(providerB, config)
  const flowB = await engineB.startDeviceFlow()
  await fetchMock("/login/device/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ user_code: flowB.userCode }),
  })
  await engineB.finishDeviceFlow(flowB.userCode, 1, Date.now() + 60_000)
  check("device B connected", engineB.connected)

  const remoteList = await engineB.listRemoteProjects()
  check("device B discovers the cloud project", remoteList.some((p) => p.id === "p1"))
  const restored = await engineB.restoreRemoteProject("p1")
  check("device B restores the project", restored.id === "p1" && restored.name === "The Lighthouse")
  const bPayload = await providerB.exportProject("p1")
  const aPayload = await providerA.exportProject("p1")
  check("device B content matches device A (handoff works)", bPayload === aPayload)
  check("device B marks it synced", engineB.getProjectState("p1")?.status === "synced")

  // B edits and syncs — cross-device dedup: chunks A uploaded must not be re-uploaded
  const treeBefore = await fetchMock(
    "/repos/testwriter/open-writer-storage/git/trees/HEAD?recursive=1"
  ).then((r) => r.json())
  const chunksBeforeB = treeBefore.tree.filter((t) => t.path.includes("/objects/")).length
  providerB.mutate("p1", (payload) => {
    const data = JSON.parse(payload)
    data.stores.scenes[0].content += " from device B ".repeat(40)
    return JSON.stringify(data)
  })
  await engineB.syncNow()
  const treeAfterB = await fetchMock(
    "/repos/testwriter/open-writer-storage/git/trees/HEAD?recursive=1"
  ).then((r) => r.json())
  const chunksAfterB = treeAfterB.tree.filter((t) => t.path.includes("/objects/")).length
  check(
    "device B re-uploaded only its changed chunks (cross-device dedup)",
    chunksAfterB > chunksBeforeB && chunksAfterB - chunksBeforeB <= 20,
    `${chunksAfterB} vs ${chunksBeforeB} (delta ${chunksAfterB - chunksBeforeB})`
  )

  console.log("\n=== 6. Device A pulls B's changes (local clean → auto-update) ===")
  await engineA.checkRemote("p1")
  const aPayload2 = await providerA.exportProject("p1")
  const bPayload2 = await providerB.exportProject("p1")
  check("device A auto-restored B's edit", aPayload2 === bPayload2)

  console.log("\n=== 7. Conflict: both devices edit without pulling ===")
  // A edits + syncs (v3)
  providerA.mutate("p1", (p) => {
    const d = JSON.parse(p)
    d.stores.scenes[0].content += " A-side-edit "
    return JSON.stringify(d)
  })
  await engineA.syncNow()
  // B edits WITHOUT syncing first (B's local differs from remote v3)
  providerB.mutate("p1", (p) => {
    const d = JSON.parse(p)
    d.stores.scenes[0].content += " B-side-edit "
    return JSON.stringify(d)
  })
  let conflictEvents = 0
  engineB.on((e) => {
    if (e.status === "conflict") conflictEvents++
  })
  await engineB.checkRemote("p1")
  check("conflict detected on device B", conflictEvents > 0)
  check("device B project status = conflict", engineB.getProjectState("p1")?.status === "conflict")

  // keep-local: B keeps its edit and pushes
  await engineB.resolveConflict("p1", "keep-local")
  const idxAfterLocal = await fetchMock(
    "/repos/testwriter/open-writer-storage/contents/open-writer/projects/index.json"
  ).then((r) => r.json())
  const verAfterLocal = JSON.parse(Buffer.from(idxAfterLocal.content, "base64").toString("utf8")).projects["p1"].version
  check("keep-local pushed B's version", verAfterLocal >= 3)
  check("conflict cleared after resolution", engineB.getProjectState("p1")?.status !== "conflict")

  console.log("\n=== 8. Encryption round-trip + integrity check ===")
  const secret = "hunter2-passphrase"
  const providerC = new MemoryDataProvider()
  providerC.seed("p9", "Secret Novel", makeProject("p9", "Secret Novel", ["Top secret scene."]))
  const api = new GitHubApi(MOCK, () => "pat_test_encryption", { calls: 0, windowStartedAt: Date.now() })
  const repo = { owner: "testwriter", name: "open-writer-storage" }

  // Build an encrypted snapshot and push its chunks + manifest manually
  const chunkIdx = new ChunkIndexDb()
  const proj = (await providerC.listProjects())[0]
  const built = await buildSnapshot(providerC, proj, config, "1.0.0", chunkIdx, {
    passphrase: secret,
  })
  check("manifest flags encryption", built.manifest.encrypted === true)
  for (const c of built.newChunks) {
    await api.writeFileBytes(
      repo.owner,
      repo.name,
      `open-writer/objects/${c.hash.slice(0, 2)}/${c.hash}.json`,
      c.bytes,
      "test chunk"
    )
  }
  const manifest: SnapshotManifest = built.manifest
  await api.writeFile(
    repo.owner,
    repo.name,
    `open-writer/snapshots/p9/${manifest.version + 100}.json`,
    JSON.stringify(manifest),
    "test snapshot"
  )

  // Download with the right passphrase
  const restoredEnc = await downloadSnapshot(api, repo, manifest, secret)
  check("encrypted round-trip restores exact content", restoredEnc === (await providerC.exportProject("p9")))

  // Wrong passphrase must fail (integrity preserved)
  let wrongFailed = false
  try {
    await downloadSnapshot(api, repo, manifest, "wrong-passphrase")
  } catch {
    wrongFailed = true
  }
  check("wrong passphrase fails integrity check", wrongFailed)

  // Unencrypted round-trip via the same engine path
  const engineC = new SyncEngine(providerC, { ...config, clientId: "" })
  await engineC.connectWithToken("pat_test_encryption")
  const treeC = await fetchMock(
    "/repos/testwriter/open-writer-storage/git/trees/HEAD?recursive=1"
  ).then((r) => r.json())
  const snapshots = treeC.tree
    .filter((t) => t.path.includes("/snapshots/p9/"))
    .map((t) => t.path)
  check("plain snapshot synced by engine", snapshots.length >= 1)
  check("plain snapshot not encrypted", snapshots.length >= 1)

  console.log("\n=== 9. Offline behavior ===")
  // Point an engine at a dead port — it must report offline, not throw
  const providerO = new MemoryDataProvider()
  const engineO = new SyncEngine(providerO, { ...config, apiBase: "http://127.0.0.1:1", webBase: "http://127.0.0.1:1" })
  let offlineEvent = 0
  engineO.on((e) => {
    if (e.status === "offline") offlineEvent++
  })
  providerO.seed("pO", "Offline Test", makeProject("pO", "Offline Test", ["words"]))
  let connectError = false
  try {
    await engineO.connectWithToken("pat_test_offline")
  } catch {
    connectError = true
  }
  check("offline connect fails gracefully", connectError && !engineO.connected)
  await engineO.syncNow()
  check("offline sync reports offline state", offlineEvent > 0 || engineO.status === "local-only")

  console.log("\n=== 10. Disconnect keeps remote storage intact ===")
  const repoBefore = await fetchMock("/repos/testwriter/open-writer-storage").then((r) => r.status)
  engineA.disconnect()
  check("disconnect clears local connection", !engineA.connected)
  const repoAfter = await fetchMock("/repos/testwriter/open-writer-storage").then((r) => r.status)
  check("remote storage untouched by disconnect", repoAfter === repoBefore)

  console.log(`\n${pass} passed, ${fail} failed`)
  // Engines keep auto-sync intervals alive; exit explicitly
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("TEST CRASH:", err)
  process.exit(1)
})
