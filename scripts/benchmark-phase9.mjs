// Phase 9 benchmark: GitHub sync storage + tiny AI at 100k/250k word scale.
// Uses the real production modules (snapshot builder + tiny-ai) via bun.
// Run: bun scripts/benchmark-phase9.mjs
import { buildSnapshot, restoreSnapshot } from "../src/lib/github-sync/snapshot.ts";
import { MemoryDataProvider } from "../src/lib/github-sync/data-provider.ts";
import {
  extractMetadata,
  classifyScene,
  suggestTags,
  proofread,
  rerank,
  summarize,
} from "../src/lib/ai/tiny-ai.ts";

const words = (n) => {
  // Deterministic prose: ~200 words per block, repeated with slight variation.
  const block =
    "The cold wind swept across the valley as Marisol reached the gate of the old estate. " +
    "Beyond it, the garden lay overgrown, but a single lamp still burned in the library window. " +
    "She had come for the journal, the one her grandmother had hidden before the fire. " +
    "Every step brought her closer to a truth the village had buried for decades. ";
  const blocks = Math.ceil(n / block.split(/\s+/).length);
  let out = "";
  for (let i = 0; i < blocks; i++) out += block + ` (passage ${i}) `;
  return out;
};

const corpus = (n) => {
  // Realistic manuscript: scenes of ~1000 words each.
  const per = 1000;
  const sceneCount = Math.max(1, Math.round(n / per));
  const scenes = [];
  for (let i = 0; i < sceneCount; i++) scenes.push(words(per));
  return scenes;
};

const fmt = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`);
const mem = () => `${(process.memoryUsage().heapUsed / 1048576).toFixed(1)} MB`;

const config = {
  chunkSize: 48 * 1024,
  maxChunksPerCommit: 400,
  repoName: "open-writer-storage",
  baseUrl: "http://127.0.0.1:9090",
};

// In-memory ChunkIndex matching the production interface (has/add).
function makeChunkIndex(existing = new Map()) {
  return {
    has: (h) => existing.has(h),
    add: async (h, size) => { existing.set(h, size); },
    _map: existing,
  };
}

async function benchSync(label, sceneWords) {
  console.log(`\n=== Sync storage @ ${label} ===`);
  const provider = new MemoryDataProvider();
  const scenes = corpus(sceneWords);
  const payload = JSON.stringify({
    schema: 1,
    project: { id: "bench-project", name: "Benchmark", createdAt: Date.now(), updatedAt: Date.now() },
    stores: {
      projects: [{ id: "bench-project", name: "Benchmark", createdAt: Date.now(), updatedAt: Date.now() }],
      scenes: scenes.map((s, i) => ({ id: `s${i}`, projectId: "bench-project", title: `Scene ${i}`, content: s })),
    },
  });
  provider.seed("bench-project", "Benchmark", payload);
  const project = { id: "bench-project", name: "Benchmark", updatedAt: new Date().toISOString() };

  // Build snapshot (compress + chunk + dedup)
  const idx0 = makeChunkIndex();
  const t0 = performance.now();
  const built = await buildSnapshot(provider, project, config, "1.0.0", idx0);
  const t1 = performance.now();
  const chunkCount = built.manifest.chunks.length;
  const newChunkCount = built.newChunks.length;
  const rawBytes = (await provider.exportProject("bench-project")).length;
  const compressedBytes = newChunkCount * config.chunkSize;
  console.log(`  build snapshot:     ${fmt(t1 - t0)}`);
  console.log(`  chunks:             ${chunkCount} total, ${newChunkCount} new`);
  console.log(`  raw:                ${(rawBytes / 1048576).toFixed(2)} MB`);
  console.log(`  compressed:         ${(compressedBytes / 1048576).toFixed(2)} MB (${((1 - compressedBytes / rawBytes) * 100).toFixed(0)}% smaller)`);

  // Dedup: rebuild with same content (no-op) — dedup means 0 new chunks.
  const idx1 = makeChunkIndex(idx0._map);
  const t2 = performance.now();
  const built2 = await buildSnapshot(provider, project, config, "1.0.0", idx1);
  const t3 = performance.now();
  console.log(`  incremental (no change): ${fmt(t3 - t2)}, new chunks: ${built2.newChunks.length}`);

  // Small delta: edit one scene
  provider.mutate("bench-project", (raw) => {
    const parsed = JSON.parse(raw);
    parsed.stores.scenes[0].content = parsed.stores.scenes[0].content.slice(0, 1000) + " A new paragraph arrived in the night.";
    return JSON.stringify(parsed);
  });
  const t4 = performance.now();
  const built3 = await buildSnapshot(provider, project, config, "1.0.0", idx1);
  const t5 = performance.now();
  console.log(`  incremental (1 scene edit): ${fmt(t5 - t4)}, new chunks: ${built3.newChunks.length}`);

  // Restore (download+verify is covered by the sync E2E suite; here we time the import of the verified payload)
  const rawPayload = await provider.exportProject("bench-project");
  const t6 = performance.now();
  await restoreSnapshot(provider, "bench-project", rawPayload);
  const t7 = performance.now();
  const restored = await provider.exportProject("bench-project");
  console.log(`  restore (import):   ${fmt(t7 - t6)} (${(restored?.length / 1048576).toFixed(2)} MB restored)`);
  return { chunkCount, newChunks: built3.newChunks.length };
}

function benchTiny(label, text) {
  console.log(`\n=== Tiny AI @ ${label} ===`);
  const t0 = performance.now();
  const md = extractMetadata(text.slice(0, 20000));
  const t1 = performance.now();
  const cls = classifyScene(text.slice(0, 20000));
  const t2 = performance.now();
  const tags = suggestTags(text.slice(0, 20000));
  const t3 = performance.now();
  const pr = proofread(text.slice(0, 50000));
  const t4 = performance.now();
  const ranked = rerank("old estate lamp journal", ["village fire", "library lamp journal", "garden overgrown", "cold wind valley"], 10);
  const t5 = performance.now();
  const sum = summarize(text.slice(0, 20000));
  const t6 = performance.now();
  console.log(`  metadata:   ${fmt(t1 - t0)} (${md.entities?.length || 0} entities)`);
  console.log(`  classify:   ${fmt(t2 - t1)} (${cls.category})`);
  console.log(`  tags:       ${fmt(t3 - t2)} (${tags.length} tags)`);
  console.log(`  proofread:  ${fmt(t4 - t3)} (${pr.length} issues)`);
  console.log(`  rerank:     ${fmt(t5 - t4)}`);
  console.log(`  summarize:  ${fmt(t6 - t5)} (${sum.split(/\s+/).length} words)`);
}

console.log(`heap before: ${mem()}`);
benchSync("100k words", 100000);
console.log(`heap @100k: ${mem()}`);
benchSync("250k words", 250000);
console.log(`heap @250k: ${mem()}`);

benchTiny("100k-word corpus (samples)", corpus(100000).join(" "));
benchTiny("250k-word corpus (samples)", corpus(250000).join(" "));
console.log(`\nheap final: ${mem()}`);
