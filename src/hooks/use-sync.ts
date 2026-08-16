"use client"

import { useEffect, useState } from "react"
import {
  ensureSyncEngine,
  EngineSnapshot,
  SyncEngine,
  SyncStatus,
} from "@/lib/github-sync"

/**
 * Live view of the sync engine for React components. Re-renders on every
 * engine event (status change, per-project change, message).
 */
export function useSync(): {
  snapshot: EngineSnapshot
  engine: SyncEngine
  projectStatus: (projectId: string) => ProjectBadge
} {
  const engine = ensureSyncEngine()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const off = engine.on(() => setTick((t) => t + 1))
    // Re-render on a timer too: "syncing" is transient and events are
    // best-effort; the pill should never go stale.
    const t = setInterval(() => setTick((t) => t + 1), 5_000)
    return () => {
      off()
      clearInterval(t)
    }
  }, [engine])

  const snapshot = engine.getEngineSnapshot()
  void tick

  return {
    snapshot,
    engine,
    projectStatus: (projectId) => badgeFor(snapshot, projectId),
  }
}

export interface ProjectBadge {
  status: SyncStatus | "synced" | "conflict" | "offline" | "local"
  label: string
}

function badgeFor(
  snapshot: EngineSnapshot,
  projectId: string
): ProjectBadge {
  if (!snapshot.connected) {
    return { status: "local", label: "Local" }
  }
  const ps = snapshot.projects[projectId]
  if (!ps) {
    return { status: "local", label: "Local only" }
  }
  if (ps.status === "conflict") {
    return { status: "conflict", label: "Conflict" }
  }
  if (ps.status === "syncing") {
    return { status: "syncing", label: "Syncing…" }
  }
  if (ps.status === "attention") {
    return { status: "attention", label: "Needs attention" }
  }
  if (snapshot.status === "offline" || snapshot.status === "full") {
    return { status: "offline", label: "Offline" }
  }
  if (ps.syncedAt) {
    return { status: "synced", label: "Synced" }
  }
  return { status: "local", label: "Local only" }
}
