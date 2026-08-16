/**
 * Browser-local persistence for Open Writer.
 *
 * A minimal promise-based IndexedDB wrapper (no external dependencies).
 * All records are stored as JSON-safe plain objects keyed by `id`.
 * Dates are stored as ISO-8601 strings (matching what the previous
 * Prisma-backed API returned to the client after JSON serialization).
 */

export const DB_NAME = "open-writer"
export const DB_VERSION = 1

export const STORES = [
  "projects",
  "chapters",
  "scenes",
  "characters",
  "locations",
  "storyObjects",
  "worldElements",
  "timelineEvents",
  "relationships",
  "notes",
  "comments",
  "versions",
  "goals",
  "sessions",
  "agentTasks",
] as const

export type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment"))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" })
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"))
  })
  return dbPromise
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const request = fn(t.objectStore(store))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"))
      })
  )
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  return tx(store, "readonly", (s) => s.getAll())
}

export async function getById<T>(store: StoreName, id: string): Promise<T | undefined> {
  return tx(store, "readonly", (s) => s.get(id))
}

export async function putRecord(store: StoreName, record: unknown): Promise<void> {
  await tx(store, "readwrite", (s) => s.put(record))
}

export async function bulkPut(store: StoreName, records: unknown[]): Promise<void> {
  if (records.length === 0) return
  await tx(store, "readwrite", (s) => {
    for (const r of records) s.put(r)
    return s.count()
  })
}

export async function deleteRecord(store: StoreName, id: string): Promise<void> {
  await tx(store, "readwrite", (s) => s.delete(id))
}

/**
 * Replaces the entire contents of a store with the given records.
 * Unlike bulkPut (which only writes records and never removes any),
 * this clears the store first so records absent from the array are
 * actually deleted. Required for cascade deletes, project deletion,
 * version pruning and backup restore.
 */
export async function replaceStore(store: StoreName, records: unknown[]): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(store, "readwrite")
    const s = t.objectStore(store)
    s.clear()
    for (const r of records) s.put(r)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error ?? new Error("IndexedDB transaction failed"))
    t.onabort = () => reject(t.error ?? new Error("IndexedDB transaction aborted"))
  })
}

export async function clearStore(store: StoreName): Promise<void> {
  await tx(store, "readwrite", (s) => s.clear())
}
