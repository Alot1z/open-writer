/**
 * Local index of every chunk already stored remotely. Lets the engine
 * skip uploads of unchanged content (dedup) and, after merging the
 * remote tree, avoids re-uploading chunks another device stored.
 *
 * Kept in its own IndexedDB database so it never mixes with project
 * data, backups or exports.
 */

import { ChunkIndex } from "./snapshot"

const DB_NAME = "open-writer-sync"
const STORE = "chunks"
const VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"))
      return
    }
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "hash" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("open failed"))
  })
  return dbPromise
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const r = fn(t.objectStore(STORE))
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error ?? new Error("request failed"))
      })
  )
}

export class ChunkIndexDb implements ChunkIndex {
  has(hash: string): boolean {
    // Synchronous check needed by buildSnapshot's loop; keep a tiny
    // in-memory cache fed by add() and merged from the remote tree.
    if (this.cache.has(hash)) return true
    void this.warm(hash)
    return this.cache.has(hash)
  }

  private cache = new Set<string>()

  async add(hash: string, size: number): Promise<void> {
    this.cache.add(hash)
    await run("readwrite", (s) =>
      s.put({ hash, size, ts: Date.now() } as unknown as IDBValidKey)
    ).catch(() => {})
  }

  private warming = new Set<string>()

  private async warm(hash: string): Promise<void> {
    if (this.warming.has(hash) || this.cache.has(hash)) return
    this.warming.add(hash)
    try {
      const row = await run<{ hash?: string } | undefined>("readonly", (s) => s.get(hash))
      if (row) this.cache.add(hash)
    } catch {
      /* non-fatal */
    } finally {
      this.warming.delete(hash)
    }
  }

  /** Merge the full remote file list (from the Git tree) into the cache. */
  async mergeRemotePaths(paths: string[]): Promise<void> {
    for (const p of paths) {
      const match = /^open-writer\/objects\/[0-9a-f]{2}\/([0-9a-f]{64})\.json$/.exec(p)
      if (match) this.cache.add(match[1])
    }
  }

  async count(): Promise<number> {
    try {
      return await run<number>("readonly", (s) => s.count())
    } catch {
      return this.cache.size
    }
  }
}
