/**
 * Configuration for Open Writer's private GitHub storage.
 *
 * Zero-config by design: the user never sees these values. When the
 * device-flow client id is configured, "Connect GitHub" is one click;
 * otherwise Open Writer falls back to a one-time token paste.
 */

export interface SyncConfig {
  /** GitHub App client id used for the OAuth device flow. Empty → token fallback. */
  clientId: string
  /** Human-facing app name shown during authorization. */
  appName: string
  /** Name of the private storage repository Open Writer creates. */
  repoName: string
  /** Description written on the created repository so it is identifiable. */
  repoDescription: string
  /** Marker placed in the repository so Open Writer never attaches to an unrelated repo. */
  repoMarker: string
  /** REST API base. Overridable for tests/local mirrors. */
  apiBase: string
  /** Web base for the OAuth endpoints. Overridable for tests. */
  webBase: string
  /** Maximum size of one content-addressed chunk (compressed bytes). */
  chunkSize: number
  /** Idle time before a queued sync starts. */
  debounceMs: number
  /** Maximum consecutive failures before pausing sync with a clear message. */
  maxRetries: number
  /** Base delay for exponential backoff. */
  backoffBaseMs: number
  /** Format version of the snapshot layout. */
  schema: number
}

export const SYNC_CONFIG: SyncConfig = {
  // To enable one-click "Connect GitHub", register a GitHub App with the
  // device flow enabled and put its client id here (see docs/sync-github.md).
  // All values are overridable at build time via NEXT_PUBLIC_SYNC_* vars.
  clientId: process.env.NEXT_PUBLIC_SYNC_CLIENT_ID ?? "",
  appName: "Open Writer",
  repoName: process.env.NEXT_PUBLIC_SYNC_REPO ?? "open-writer-storage",
  repoDescription: "Private storage for Open Writer projects (created by Open Writer)",
  repoMarker: "open-writer-storage-v1",
  apiBase: process.env.NEXT_PUBLIC_SYNC_API_BASE ?? "https://api.github.com",
  webBase: process.env.NEXT_PUBLIC_SYNC_WEB_BASE ?? "https://github.com",
  chunkSize: 48 * 1024,
  debounceMs: 30_000,
  maxRetries: 5,
  backoffBaseMs: 5_000,
  schema: 1,
}
