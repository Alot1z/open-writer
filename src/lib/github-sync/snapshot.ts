/**
 * Content-addressed snapshots.
 *
 * A snapshot is a small manifest referencing compressed, content-addressed
 * chunks. Identical chunks (and identical projects) are stored once and
 * reused across versions, so syncing an edited manuscript uploads only the
 * chunks that actually changed.
 */

import { GitHubApi } from "./api"
import { SyncConfig } from "./config"
import { SyncDataProvider, ProjectMeta } from "./data-provider"
import {
  base64Encode,
  bytesToString,
  chunkBytes,
  compressBytes,
  decompressBytes,
  decryptPayload,
  encryptPayload,
  getDeviceId,
  sha256Hex,
  stringToBytes,
} from "./crypto"

export interface SnapshotManifest {
  schema: number
  projectId: string
  version: number
  createdAt: string
  deviceId: string
  appVersion: string
  encrypted: boolean
  checksum: string // SHA-256 of the raw payload
  rawSize: number
  compressedSize: number
  chunks: string[] // content hashes, in order
}

export interface RemoteIndex {
  schema: number
  projects: Record<string, RemoteProjectEntry>
  updatedAt: string
}

export interface RemoteProjectEntry {
  id: string
  name: string
  updatedAt: string
  version: number
  checksum: string
  syncedAt: string
  encrypted: boolean
}

export const INDEX_PATH = "open-writer/projects/index.json"
export const metaPath = () => "open-writer/meta.json"
export const snapshotPath = (projectId: string, version: number) =>
  `open-writer/snapshots/${projectId}/${version}.json`
export const chunkPath = (hash: string) =>
  `open-writer/objects/${hash.slice(0, 2)}/${hash}.json`

export interface BuildResult {
  manifest: SnapshotManifest
  /** chunks already present locally (hash → size), used to skip uploads */
  newChunks: { hash: string; bytes: Uint8Array }[]
}

export interface ChunkIndex {
  has: (hash: string) => boolean
  add: (hash: string, size: number) => Promise<void>
}

export async function buildSnapshot(
  provider: SyncDataProvider,
  project: ProjectMeta,
  config: SyncConfig,
  appVersion: string,
  chunkIndex: ChunkIndex,
  opts: { passphrase?: string; salt?: Uint8Array } = {}
): Promise<BuildResult> {
  const raw = await provider.exportProject(project.id)
  const rawBytes = stringToBytes(raw)
  const checksum = await sha256Hex(rawBytes)

  let payloadBytes = rawBytes
  const encrypted = Boolean(opts.passphrase)
  if (encrypted) {
    // Salt is derived deterministically from the content checksum so the
    // decryptor can reconstruct it without any extra metadata on the wire.
    const digest = await crypto.subtle.digest(
      "SHA-256",
      stringToBytes(checksum) as BufferSource
    )
    const salt = opts.salt ?? new Uint8Array(digest).slice(0, 16)
    payloadBytes = await encryptPayload(payloadBytes, opts.passphrase!, salt)
  }

  const compressed = await compressBytes(payloadBytes)
  const chunks = chunkBytes(compressed, config.chunkSize)

  const hashes: string[] = []
  const newChunks: { hash: string; bytes: Uint8Array }[] = []
  for (const c of chunks) {
    const hash = await sha256Hex(c)
    hashes.push(hash)
    if (!chunkIndex.has(hash)) {
      newChunks.push({ hash, bytes: c })
      await chunkIndex.add(hash, c.length)
    }
  }

  const manifest: SnapshotManifest = {
    schema: config.schema,
    projectId: project.id,
    version: 0, // assigned by the engine (remote version + 1)
    createdAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    appVersion,
    encrypted,
    checksum,
    rawSize: rawBytes.length,
    compressedSize: compressed.length,
    chunks: hashes,
  }

  return { manifest, newChunks }
}

/** Fetch, reassemble and verify a remote snapshot. */
export async function downloadSnapshot(
  api: GitHubApi,
  repo: { owner: string; name: string },
  manifest: SnapshotManifest,
  passphrase?: string
): Promise<string> {
  const parts: Uint8Array[] = []
  for (const hash of manifest.chunks) {
    const bytes = await api.readFileBytes(repo.owner, repo.name, chunkPath(hash))
    if (!bytes) throw new Error("Remote snapshot is incomplete — a chunk is missing")
    parts.push(bytes)
  }
  let total = 0
  for (const p of parts) total += p.length
  const merged = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    merged.set(p, offset)
    offset += p.length
  }

  const decompressed = await decompressBytes(merged)
  let payloadBytes = decompressed
  if (manifest.encrypted) {
    if (!passphrase) throw new Error("This snapshot is encrypted — enter its passphrase")
    const salt = new Uint8Array(16)
    // The salt is derived deterministically from the checksum so no extra
    // metadata is needed on the wire.
    const digest = await crypto.subtle.digest(
      "SHA-256",
      stringToBytes(manifest.checksum) as BufferSource
    )
    salt.set(new Uint8Array(digest).slice(0, 16))
    payloadBytes = await decryptPayload(decompressed, passphrase, salt)
  }

  const raw = bytesToString(payloadBytes)
  const actual = await sha256Hex(stringToBytes(raw))
  if (actual !== manifest.checksum) {
    throw new Error("Remote snapshot failed its integrity check — it will not be restored")
  }
  return raw
}

export async function restoreSnapshot(
  provider: SyncDataProvider,
  projectId: string,
  raw: string
): Promise<void> {
  await provider.importProject(projectId, raw)
}

export function writeChunkFile(bytes: Uint8Array): string {
  return base64Encode(bytes)
}

export { base64Encode }
