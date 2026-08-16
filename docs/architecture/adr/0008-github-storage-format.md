# ADR 0008 — GitHub storage format (content-addressed, chunked)

**Status:** Accepted (implemented)
**Date:** 2026-08-16

## Context

The private storage repo must scale with many projects over years while
staying inside GitHub's limits (100 MB/file hard limit, ~1 GB repo
recommendation, 5,000 API req/hr per token).

## Decision

- **One private repo, many projects** (`open-writer-storage`):
  `meta.json` (marker + schema + device id), `projects/index.json`
  (every project + latest version + checksum), `snapshots/<project>/<v>.json`
  (manifests), `objects/<ab>/<sha256>.json` (gzip-compressed chunks).
- Chunks are **content-addressed** (SHA-256) and deduplicated across
  versions and devices (remote tree merged into the local index first).
- Chunk size is small (tens of KB) → far below the 100 MB/file limit;
  a writer's whole corpus is ~MBs → far below the repo limit.
- Uploads are delta-only; the manifest is the only always-updated file.

## Consequences

- ✅ Efficient (dedup + delta), cheap (few API calls per sync).
- ✅ Verified: 30/30 tests cover no-op sync (zero uploads), delta sync,
  cross-device dedup, restore integrity.
- ⚠️ Remote files are non-atomic per Contents API PUT; the manifest
  pattern + checksum verification protects against partial writes.
- 🔄 Long-term: snapshot compaction/pruning is planned housekeeping, not a
  near-term need.
