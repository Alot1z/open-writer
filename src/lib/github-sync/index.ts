/**
 * Public entry point for Open Writer's private GitHub storage.
 *
 * Usage (browser):
 *   import { syncEngine, ensureEngine, initSync } from "@/lib/github-sync"
 *   await initSync()                      // on app start
 *   syncEngine.on((e) => ...)             // subscribe to status changes
 *   syncEngine.syncNow()                  // push pending changes
 */

import { SYNC_CONFIG } from "./config"
import { IndexedDBDataProvider } from "./data-provider"
import { SyncEngine } from "./engine"

export * from "./config"
export * from "./engine"
export * from "./status"
export * from "./crypto"
export * from "./data-provider"

export const APP_VERSION = "1.0.0"

let _engine: SyncEngine | null = null

/** Get (or lazily create) the browser singleton backed by IndexedDB. */
export function ensureSyncEngine(): SyncEngine {
  if (!_engine) {
    _engine = new SyncEngine(new IndexedDBDataProvider(), SYNC_CONFIG, APP_VERSION)
  }
  return _engine
}

/** Restore the session and start background synchronization. */
export async function initSync(): Promise<SyncEngine> {
  const engine = ensureSyncEngine()
  await engine.init()
  return engine
}
