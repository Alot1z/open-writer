/**
 * Low-level helpers: SHA-256, gzip (de)compression, chunking and
 * optional payload encryption. All browser-native (crypto.subtle +
 * CompressionStream), so nothing here needs a server.
 */

export function bytesToHex(bytes: Uint8Array): string {
  let hex = ""
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0")
  }
  return hex
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export function stringToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

export function bytesToString(b: Uint8Array): string {
  return new TextDecoder().decode(b)
}

export function base64Encode(b: Uint8Array): string {
  // Browser-safe btoa over binary string chunks
  let bin = ""
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i])
  return btoa(bin)
}

export function base64Decode(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? stringToBytes(data) : data
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource)
  return bytesToHex(new Uint8Array(digest))
}

export async function compressBytes(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("gzip")
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(cs)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

export async function decompressBytes(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("gzip")
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

export function chunkBytes(data: Uint8Array, size: number): Uint8Array[] {
  const chunks: Uint8Array[] = []
  for (let i = 0; i < data.length; i += size) {
    chunks.push(data.slice(i, Math.min(i + size, data.length)))
  }
  return chunks
}

/** Encrypt a payload with AES-256-GCM, deriving the key from a passphrase (PBKDF2). */
export async function encryptPayload(
  data: Uint8Array,
  passphrase: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    stringToBytes(passphrase) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 150_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data as BufferSource
  )
  const out = new Uint8Array(iv.length + cipher.byteLength)
  out.set(iv, 0)
  out.set(new Uint8Array(cipher), iv.length)
  return out
}

export async function decryptPayload(
  data: Uint8Array,
  passphrase: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    stringToBytes(passphrase) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 150_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
  const iv = data.slice(0, 12)
  const cipher = data.slice(12)
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher as BufferSource
  )
  return new Uint8Array(plain)
}

export function randomId(len = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Stable per-browser/per-device identifier stored in sync metadata. */
export function getDeviceId(): string {
  if (typeof localStorage === "undefined") return randomId()
  let id = localStorage.getItem("openwriter-device-id")
  if (!id) {
    id = randomId()
    localStorage.setItem("openwriter-device-id", id)
  }
  return id
}
