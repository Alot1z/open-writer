/**
 * The sync engine. Drives everything the user sees as "private cloud
 * storage": connection, background synchronization, offline-first
 * behavior, conflict detection, device-to-device restore, and friendly
 * status reporting. It never touches the UI directly — components
 * subscribe to events.
 */

import { GitHubApi, GitHubApiError } from "./api"
import { GitHubAuth } from "./auth"
import { ChunkIndexDb } from "./chunk-index"
import { SyncConfig } from "./config"
import { SyncDataProvider, ProjectMeta } from "./data-provider"
import {
  buildSnapshot,
  downloadSnapshot,
  INDEX_PATH,
  RemoteIndex,
  SnapshotManifest,
  snapshotPath,
  chunkPath,
  restoreSnapshot,
} from "./snapshot"
import { ensureStorageRepo, StorageRepo } from "./repo"
import { getDeviceId, sha256Hex, stringToBytes } from "./crypto"

export type SyncStatus =
  | "local-only"
  | "connecting"
  | "syncing"
  | "synced"
  | "offline"
  | "paused"
  | "attention"
  | "conflict"
  | "full"
  | "unavailable"

export type ProjectSyncState = {
  name: string
  syncedAt: string | null
  localVersion: number
  remoteVersion: number
  syncedChecksum: string | null
  encrypted: boolean
  status: "local" | "syncing" | "synced" | "offline" | "conflict" | "attention"
  lastSeenUpdatedAt: string | null
  rawSize?: number
}

export interface EngineSnapshot {
  status: SyncStatus
  message: string
  connected: boolean
  owner: string | null
  username: string | null
  repoFullName: string | null
  connectedAt: string | null
  lastSyncedAt: string | null
  deviceId: string
  apiCalls: number
  projects: Record<string, ProjectSyncState>
  storageBytes: number
  chunkCount: number
}

export interface EngineEvent {
  status: SyncStatus
  message?: string
  projectId?: string
}

export interface PersistedEngineState {
  connected: boolean
  owner: string | null
  username: string | null
  repoName: string | null
  repoFullName: string | null
  connectedAt: string | null
  lastSyncedAt: string | null
  apiCalls: number
  apiWindowStartedAt: number
  projects: Record<string, ProjectSyncState>
  storageBytes: number
  chunkCount: number
}

const STATE_KEY = "openwriter-sync-state"

export class SyncEngine {
  private auth: GitHubAuth
  private api: GitHubApi
  private apiStats = { calls: 0, windowStartedAt: Date.now() }
  private chunkIndex = new ChunkIndexDb()
  private repo: StorageRepo | null = null
  private state: PersistedEngineState = {
    connected: false,
    owner: null,
    username: null,
    repoName: null,
    repoFullName: null,
    connectedAt: null,
    lastSyncedAt: null,
    apiCalls: 0,
    apiWindowStartedAt: Date.now(),
    projects: {},
    storageBytes: 0,
    chunkCount: 0,
  }
  private listeners = new Set<(e: EngineEvent) => void>()
  private syncing = false
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null
  private conflictFor: string | null = null

  constructor(
    private readonly provider: SyncDataProvider,
    private readonly config: SyncConfig,
    private readonly appVersion = "1.0.0"
  ) {
    this.auth = new GitHubAuth(
      config.clientId,
      config.apiBase,
      config.webBase,
      this.apiStats
    )
    this.api = new GitHubApi(config.apiBase, () => this.auth.getToken(), this.apiStats)
  }

  // ── Events ────────────────────────────────────────────────────────────

  on(listener: (e: EngineEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(e: EngineEvent): void {
    for (const l of this.listeners) l(e)
  }

  // ── Public accessors ──────────────────────────────────────────────────

  get connected(): boolean {
    return this.state.connected && this.auth.isConnected
  }

  get authMethod(): string {
    return this.auth.getMethod()
  }

  get isDeviceFlowAvailable(): boolean {
    return this.auth.isDeviceFlowAvailable
  }

  get status(): SyncStatus {
    return this.computeStatus()
  }

  getEngineSnapshot(): EngineSnapshot {
    const projects: Record<string, ProjectSyncState> = {}
    for (const [id, ps] of Object.entries(this.state.projects)) {
      projects[id] = { ...ps }
    }
    return {
      status: this.computeStatus(),
      message: this.lastMessage,
      connected: this.connected,
      owner: this.state.owner,
      username: this.state.username,
      repoFullName: this.state.repoFullName,
      connectedAt: this.state.connectedAt,
      lastSyncedAt: this.state.lastSyncedAt,
      deviceId: getDeviceId(),
      apiCalls: this.state.apiCalls + this.apiStats.calls,
      projects,
      storageBytes: this.state.storageBytes,
      chunkCount: this.state.chunkCount,
    }
  }

  getProjectState(projectId: string): ProjectSyncState | undefined {
    return this.state.projects[projectId]
  }

  private lastMessage = ""

  private computeStatus(): SyncStatus {
    if (!this.connected) return "local-only"
    if (this.syncing) return "syncing"
    if (this.conflictFor) return "conflict"
    if (this.lastFailure === "full") return "full"
    if (this.lastFailure === "auth") return "attention"
    if (this.lastFailure === "network" && Date.now() - this.lastFailureAt < 60_000)
      return "offline"
    return "synced"
  }

  private lastFailure: "network" | "auth" | "full" | null = null
  private lastFailureAt = 0

  // ── Persistence ───────────────────────────────────────────────────────

  private save(): void {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(this.state))
    } catch {
      /* storage blocked — session-only */
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STATE_KEY)
      if (raw) this.state = { ...this.state, ...(JSON.parse(raw) as PersistedEngineState) }
      this.apiStats.calls = this.state.apiCalls
      this.apiStats.windowStartedAt = this.state.apiWindowStartedAt
    } catch {
      /* corrupt state — start fresh */
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  /** Restore a session, reconnect to the storage repo and check remote state. */
  async init(): Promise<void> {
    this.load()
    if (!this.state.connected) {
      this.emit({ status: "local-only", message: "" })
      return
    }
    const ok = await this.auth.restoreSession()
    if (!ok) {
      this.state.connected = false
      this.save()
      this.emit({
        status: "attention",
        message: "GitHub needs to reconnect. Your local projects are safe.",
      })
      return
    }
    try {
      await this.attachRepo()
      this.emit({ status: "synced", message: "GitHub storage ready" })
      this.startAutoSync()
    } catch {
      this.emit({
        status: "attention",
        message: "Could not reach your private storage. Your local projects are safe.",
      })
    }
  }

  private async attachRepo(): Promise<void> {
    this.repo = await ensureStorageRepo(this.api, this.auth.user!.login, this.config, this.appVersion)
    this.state.owner = this.repo.owner
    this.state.username = this.auth.user!.login
    this.state.repoName = this.repo.name
    this.state.repoFullName = this.repo.fullName
    // Merge remote chunk set once per attach for cross-device dedup
    try {
      const tree = await this.api.getTree(this.repo.owner, this.repo.name)
      await this.chunkIndex.mergeRemotePaths(tree.map((t) => t.path))
      this.state.chunkCount = await this.chunkIndex.count()
    } catch {
      /* non-fatal */
    }
    this.save()
  }

  // ── Connection ────────────────────────────────────────────────────────

  /** Start the device flow. Returns the code/URL to show the user. */
  async startDeviceFlow(): Promise<{
    userCode: string
    verificationUri: string
    expiresIn: number
  }> {
    this.emit({ status: "connecting", message: "Waiting for GitHub authorization…" })
    const start = await this.auth.startDeviceFlow()
    this.pendingDeviceCode = start.device_code
    return {
      userCode: start.user_code,
      verificationUri: start.verification_uri_complete || start.verification_uri,
      expiresIn: start.expires_in,
    }
  }

  /** Poll until the user authorizes (or the code expires). */
  async finishDeviceFlow(userCode: string, interval: number, expiresAt: number): Promise<void> {
    this.emit({ status: "connecting", message: "Waiting for GitHub authorization…" })
    const deviceCode = this.pendingDeviceCode ?? userCode
    while (Date.now() < expiresAt) {
      if (this.cancelDeviceFlowFlag) {
        this.cancelDeviceFlowFlag = false
        this.pendingDeviceCode = null
        this.emit({ status: "attention", message: "Connection cancelled." })
        return
      }
      try {
        await this.auth.pollDeviceFlow(deviceCode, interval)
        await this.afterAuthorized()
        return
      } catch (err) {
        const code = (err as Error & { code?: string }).code
      if (code === "authorization_pending" || code === "slow_down") {
        await sleep((interval + (code === "slow_down" ? 5 : 0)) * 1000)
        continue
      }
      if (code === "incorrect_device_code") {
        this.pendingDeviceCode = null
        this.emit({
          status: "attention",
          message: "GitHub could not verify this connection. Try again.",
        })
        return
      }
        if (code === "access_denied") {
          this.pendingDeviceCode = null
          this.emit({ status: "attention", message: "GitHub authorization was cancelled." })
          return
        }
        if (code === "expired_token" || code === "token_expired") {
          this.pendingDeviceCode = null
          this.emit({
            status: "attention",
            message: "The verification code expired. Try connecting again.",
          })
          return
        }
        throw err
      }
    }
    this.pendingDeviceCode = null
    this.emit({ status: "attention", message: "The verification code expired. Try again." })
  }

  private pendingDeviceCode: string | null = null

  /** Cancel an in-progress device-flow authorization. */
  cancelDeviceFlow(): void {
    this.cancelDeviceFlowFlag = true
  }

  private cancelDeviceFlowFlag = false

  /** Fallback: connect with a pasted personal access token. */
  async connectWithToken(token: string): Promise<void> {
    this.emit({ status: "connecting", message: "Connecting…" })
    try {
      await this.auth.connectWithToken(token)
    } catch (err) {
      this.emit({
        status: "attention",
        message:
          "Could not reach GitHub right now. Your local projects are safe — check your connection and try again.",
      })
      throw err
    }
    await this.afterAuthorized()
  }

  private async afterAuthorized(): Promise<void> {
    this.pendingDeviceCode = null
    this.state.connected = true
    this.state.connectedAt = new Date().toISOString()
    await this.attachRepo()
    this.save()
    // Initial verified backup
    await this.syncNow()
    this.startAutoSync()
  }

  // ── Disconnect ────────────────────────────────────────────────────────

  disconnect(): void {
    this.stopAutoSync()
    this.auth.clear()
    this.state.connected = false
    this.state.username = null
    this.state.owner = null
    this.state.repoName = null
    this.state.repoFullName = null
    this.state.lastSyncedAt = null
    this.save()
    this.emit({
      status: "local-only",
      message: "Disconnected. Your private GitHub storage remains intact on GitHub.",
    })
  }

  // ── Synchronization ───────────────────────────────────────────────────

  /** Debounced/automatic sync entry — used by the auto-sync poller. */
  async syncNow(projectId?: string): Promise<void> {
    if (!this.connected) return
    if (this.syncing) return
    this.syncing = true
    this.emit({ status: "syncing", message: "Syncing…" })
    try {
      const projects =
        projectId !== undefined
          ? (await this.provider.listProjects()).filter((p) => p.id === projectId)
          : await this.provider.listProjects()

      for (const project of projects) {
        const ps = this.state.projects[project.id] ?? this.defaultProjectState(project)
        this.state.projects[project.id] = ps

        if (this.conflictFor === project.id) {
          // A conflict needs an explicit decision; never overwrite silently
          continue
        }

        this.emit({
          status: "syncing",
          message: `Preparing ${project.name}…`,
          projectId: project.id,
        })

        const result = await buildSnapshot(
          this.provider,
          project,
          this.config,
          this.appVersion,
          this.chunkIndex
        )

        // No changes since the last push?
        if (result.manifest.checksum === ps.syncedChecksum) {
          ps.lastSeenUpdatedAt = project.updatedAt
          continue
        }

        this.emit({
          status: "syncing",
          message: `Uploading ${project.name}…`,
          projectId: project.id,
        })

        const nextVersion = Math.max(ps.remoteVersion, ps.localVersion) + 1
        result.manifest.version = nextVersion

        await this.withRetry(async () => {
          for (const chunk of result.newChunks) {
            await this.api.writeFileBytes(
              this.repo!.owner,
              this.repo!.name,
              chunkPath(chunk.hash),
              chunk.bytes,
              `Chunk ${chunk.hash.slice(0, 12)}`
            )
          }
        }, "uploading changes")

        await this.withRetry(async () => {
          await this.api.writeFile(
            this.repo!.owner,
            this.repo!.name,
            snapshotPath(project.id, nextVersion),
            JSON.stringify(result.manifest),
            `Snapshot ${project.name} v${nextVersion}`
          )
        }, "uploading snapshot")

        // Update the remote index
        await this.withRetry(async () => {
          const index = (await this.api.readJson<RemoteIndex>(
            this.repo!.owner,
            this.repo!.name,
            INDEX_PATH
          )) ?? { schema: this.config.schema, projects: {}, updatedAt: "" }
          index.projects[project.id] = {
            id: project.id,
            name: project.name,
            updatedAt: project.updatedAt,
            version: nextVersion,
            checksum: result.manifest.checksum,
            syncedAt: new Date().toISOString(),
            encrypted: result.manifest.encrypted,
          }
          index.updatedAt = new Date().toISOString()
          await this.api.writeFile(
            this.repo!.owner,
            this.repo!.name,
            INDEX_PATH,
            JSON.stringify(index),
            `Update project index`
          )
        }, "updating index")

        ps.localVersion = nextVersion
        ps.remoteVersion = nextVersion
        ps.syncedChecksum = result.manifest.checksum
        ps.syncedAt = new Date().toISOString()
        ps.status = "synced"
        ps.encrypted = result.manifest.encrypted
        ps.rawSize = result.manifest.rawSize
        ps.lastSeenUpdatedAt = project.updatedAt
        this.state.lastSyncedAt = ps.syncedAt
        this.state.storageBytes = Object.values(this.state.projects).reduce(
          (sum, p) => sum + (p.rawSize ?? 0),
          0
        )
        this.state.chunkCount = await this.chunkIndex.count()
        this.save()
      }

      this.lastFailure = null
      this.emit({ status: "synced", message: "Synced" })
    } catch (err) {
      this.handleError(err)
    } finally {
      this.syncing = false
      this.save()
    }
  }

  /** Check the remote index for changes made on other devices. */
  async checkRemote(projectId?: string): Promise<void> {
    if (!this.connected || !this.repo) return
    try {
      const index = await this.withRetry(
        () => this.api.readJson<RemoteIndex>(this.repo!.owner, this.repo!.name, INDEX_PATH),
        "checking for changes"
      )
      if (!index) return

      const ids = projectId ? [projectId] : Object.keys(index.projects)
      for (const id of ids) {
        const remote = index.projects[id]
        if (!remote) continue
        const ps = this.state.projects[id] ?? this.defaultProjectState({ id, name: remote.name, updatedAt: remote.updatedAt })
        this.state.projects[id] = ps
        if (remote.version <= (ps.remoteVersion ?? 0)) continue

        const localChecksum = await sha256Hex(
          stringToBytes(await this.provider.exportProject(id))
        )

        if (localChecksum === remote.checksum) {
          // Content already identical — just record the newer remote version
          ps.remoteVersion = remote.version
          ps.localVersion = remote.version
          ps.syncedChecksum = remote.checksum
          this.save()
          continue
        }
        if (localChecksum === ps.syncedChecksum) {
          // Local unchanged since our last push → safe to pull
          await this.pullProject(id, remote.version)
          continue
        }
        // Both sides changed
        ps.status = "conflict"
        this.conflictFor = id
        this.emit({
          status: "conflict",
          message: `Open Writer found changes on another device for “${remote.name}”.`,
          projectId: id,
        })
      }
    } catch (err) {
      this.handleError(err)
    }
  }

  /** Download and restore a remote snapshot. */
  private async pullProject(projectId: string, version: number): Promise<void> {
    if (!this.repo) return
    const manifest = await this.withRetry(
      () =>
        this.api.readJson<SnapshotManifest>(
          this.repo!.owner,
          this.repo!.name,
          snapshotPath(projectId, version)
        ),
      "downloading snapshot"
    )
    if (!manifest) throw new Error("Remote snapshot manifest is missing")
    const raw = await downloadSnapshot(this.api, this.repo, manifest)
    await restoreSnapshot(this.provider, projectId, raw)
    const ps = this.state.projects[projectId]
    if (ps) {
      ps.remoteVersion = version
      ps.localVersion = version
      ps.syncedChecksum = manifest.checksum
      ps.syncedAt = new Date().toISOString()
      ps.status = "synced"
      this.state.lastSyncedAt = ps.syncedAt
    }
    this.save()
    this.emit({
      status: "synced",
      message: "Updated from another device.",
      projectId,
    })
  }

  // ── Remote project discovery & restore ────────────────────────────────

  /**
   * Projects that exist in the cloud but not on this device. Used by the
   * project picker to offer one-click restore after connecting on a new
   * device (or after disconnecting).
   */
  async listRemoteProjects(): Promise<
    Array<{ id: string; name: string; updatedAt: string; version: number; alreadyLocal: boolean }>
  > {
    if (!this.connected || !this.repo) return []
    const index = await this.api.readJson<RemoteIndex>(
      this.repo.owner,
      this.repo.name,
      INDEX_PATH
    )
    if (!index) return []
    const local = await this.provider.listProjects()
    const localIds = new Set(local.map((p) => p.id))
    return Object.values(index.projects)
      .map((p) => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
        version: p.version,
        alreadyLocal: localIds.has(p.id),
      }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }

  /** Download a cloud project onto this device (one-click restore). */
  async restoreRemoteProject(
    projectId: string
  ): Promise<{ id: string; name: string }> {
    if (!this.connected || !this.repo) throw new Error("Not connected")
    const index = await this.api.readJson<RemoteIndex>(
      this.repo.owner,
      this.repo.name,
      INDEX_PATH
    )
    const remote = index?.projects[projectId]
    if (!remote) throw new Error("That project is no longer in your cloud storage.")
    const manifest = await this.api.readJson<SnapshotManifest>(
      this.repo.owner,
      this.repo.name,
      snapshotPath(projectId, remote.version)
    )
    if (!manifest) throw new Error("That project's snapshot is missing.")
    const raw = await downloadSnapshot(this.api, this.repo, manifest)
    await restoreSnapshot(this.provider, projectId, raw)
    const ps = this.state.projects[projectId] ?? this.defaultProjectState(remote)
    ps.remoteVersion = remote.version
    ps.localVersion = remote.version
    ps.syncedChecksum = manifest.checksum
    ps.syncedAt = new Date().toISOString()
    ps.status = "synced"
    ps.encrypted = manifest.encrypted
    this.state.projects[projectId] = ps
    this.save()
    this.emit({ status: "synced", message: `Restored “${remote.name}” from the cloud.`, projectId })
    return { id: projectId, name: remote.name }
  }

  // ── Conflict resolution ───────────────────────────────────────────────

  async resolveConflict(
    projectId: string,
    choice: "keep-local" | "keep-remote" | "save-both"
  ): Promise<void> {
    const ps = this.state.projects[projectId]
    if (!ps) return
    this.conflictFor = null

    if (choice === "keep-remote") {
      const remote = ps.remoteVersion
      await this.pullProject(projectId, remote)
    } else if (choice === "keep-local") {
      ps.status = "syncing"
      await this.syncNow(projectId)
    } else {
      // Save both: restore the remote version as a new project, keep local
      const remoteIndex = await this.withRetry(
        () =>
          this.api.readJson<RemoteIndex>(this.repo!.owner, this.repo!.name, INDEX_PATH),
        "reading project list"
      )
      const remote = remoteIndex?.projects[projectId]
      if (!remote) throw new Error("Remote project not found")
      const manifest = await this.withRetry(
        () =>
          this.api.readJson<SnapshotManifest>(
            this.repo!.owner,
            this.repo!.name,
            snapshotPath(projectId, remote.version)
          ),
        "reading snapshot"
      )
      if (!manifest) throw new Error("Remote snapshot not found")
      const raw = await downloadSnapshot(this.api, this.repo!, manifest)
      const newId = crypto.randomUUID()
      await this.provider.importAsNewProject(newId, remote.name, raw)
      this.emit({
        status: "synced",
        message: "Saved both versions — the other device's copy is a new project.",
      })
      ps.status = "synced"
      this.save()
    }
  }

  // ── Auto-sync ─────────────────────────────────────────────────────────

  startAutoSync(): void {
    if (this.autoSyncTimer) return
    this.autoSyncTimer = setInterval(() => {
      void this.checkRemote()
      void this.syncNow()
    }, this.config.debounceMs)
  }

  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
  }

  // ── Retry / backoff / errors ──────────────────────────────────────────

  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let delay = this.config.backoffBaseMs
    let attempt = 0
    for (;;) {
      try {
        return await fn()
      } catch (err) {
        attempt++
        const gh = err instanceof GitHubApiError ? err : null
        if (gh?.status === 401) {
          this.lastFailure = "auth"
          this.lastFailureAt = Date.now()
          this.state.connected = false
          this.save()
          this.emit({
            status: "attention",
            message:
              "GitHub needs to reconnect. Your local projects are safe — nothing was lost.",
          })
          throw err
        }
        if (gh?.status === 403) {
          this.lastFailure = "full"
          this.lastFailureAt = Date.now()
          this.emit({
            status: "full",
            message:
              "Storage is full for now (GitHub limits usage). Open Writer will retry automatically. Your writing stays saved on this device.",
          })
          throw err
        }
        if (attempt >= this.config.maxRetries) {
          this.lastFailure = "network"
          this.lastFailureAt = Date.now()
          this.emit({
            status: "offline",
            message:
              "Offline — changes are saved on this device and will sync automatically when the connection returns.",
          })
          throw err
        }
        this.emit({
          status: "syncing",
          message: `${label} — retrying…`,
        })
        await sleep(delay)
        delay = Math.min(delay * 2, 60_000)
      }
    }
  }

  private handleError(err: unknown): void {
    if (err instanceof GitHubApiError && err.status === 401) {
      this.emit({
        status: "attention",
        message: "GitHub needs to reconnect. Your local projects are safe.",
      })
      return
    }
    this.emit({
      status: this.lastFailure === "network" ? "offline" : "attention",
      message:
        "Could not complete the sync. Your local projects are safe — it will retry automatically.",
    })
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private defaultProjectState(project: ProjectMeta): ProjectSyncState {
    return {
      name: project.name,
      syncedAt: null,
      localVersion: 0,
      remoteVersion: 0,
      syncedChecksum: null,
      encrypted: false,
      status: "local",
      lastSeenUpdatedAt: project.updatedAt,
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
