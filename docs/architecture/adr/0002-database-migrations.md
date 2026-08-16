# ADR 0002 — Schema versioning and migrations (IndexedDB)

**Status:** Accepted (implemented)
**Date:** 2026-08-16

## Context

IndexedDB stores are created with `onupgradeneeded`, but the app must
survive future model changes without destroying user data. Data shapes
were inherited from the former Prisma models (ISO-8601 date strings).

## Decision

- Use the IndexedDB version number for structural upgrades
  (`onupgradeneeded` creates the 15 stores idempotently).
- Keep a documented `SCHEMA_VERSION`/store list in `storage.ts`; any new
  store or key change bumps the DB version and adds an upgrade step.
- **Never** destructively migrate: preserve fields with defaults, and use
  the backup/export path as the recovery net for users.
- Data-shape changes that don't touch keys are handled in services
  (defensive reads), not by rewriting stores.

## Consequences

- ✅ Safe upgrades; user data preserved.
- ✅ Mirrors the "never silently destroy data" product principle.
- ⚠️ Field migrations are manual (services-level normalization), which is
  acceptable at this data volume.
- 🔄 If SQLite WASM is adopted later (ADR-0001), a one-time export/import
  migration path is already available (exports/imports + backups).
