/**
 * Zero-config repository management.
 *
 * The user never sees repositories. Open Writer finds the account's
 * private Open Writer storage repository (identified by a marker file +
 * description), or creates one automatically, and bootstraps the
 * storage metadata. It will never attach to an unrelated repository.
 */

import { GitHubApi, GitHubApiError, GitHubRepo } from "./api"
import { SyncConfig } from "./config"
import { getDeviceId, randomId } from "./crypto"

export interface StorageMeta {
  kind: string
  schema: number
  appVersion: string
  deviceId: string
  repoId: string
  createdAt: string
  updatedAt: string
}

export interface StorageRepo {
  owner: string
  name: string
  fullName: string
  meta: StorageMeta
  created: boolean
}

function isCandidate(repo: GitHubRepo, config: SyncConfig): boolean {
  if (repo.name !== config.repoName) return false
  if (!repo.private) return false
  return true
}

export async function ensureStorageRepo(
  api: GitHubApi,
  owner: string,
  config: SyncConfig,
  appVersion: string
): Promise<StorageRepo> {
  // 1. Exact-name private repo — the common case
  let repo = await api.getRepo(owner, config.repoName)
  if (repo && !isCandidate(repo, config)) {
    throw new Error(
      "A repository named open-writer-storage already exists but is not a private Open Writer storage repository. Open Writer will not touch it."
    )
  }

  // 2. Discover an existing storage repo under a different name via the marker description
  if (!repo) {
    const repos = await api.listUserRepos()
    const candidate = repos.find(
      (r) =>
        r.description !== null &&
        r.description.includes("Open Writer") &&
        r.description.includes("storage")
    )
    if (candidate && candidate.private) repo = candidate
  }

  // 3. Create the private repository automatically
  if (!repo) {
    repo = await api.createPrivateRepo(config.repoName, config.repoDescription)
  }

  const repoOwner = repo.owner?.login ?? repo.full_name.split("/")[0]

  // 4. Bootstrap / read metadata (marker + schema)
  let meta: StorageMeta | null = null
  try {
    meta = await api.readJson<StorageMeta>(
      repoOwner,
      repo.name,
      "open-writer/meta.json"
    )
  } catch (err) {
    if (!(err instanceof GitHubApiError) || err.status !== 404) throw err
  }

  if (meta && meta.kind !== config.repoMarker) {
    throw new Error(
      "That repository already contains data from another app. Open Writer will not overwrite it."
    )
  }

  const now = new Date().toISOString()
  if (!meta) {
    meta = {
      kind: config.repoMarker,
      schema: config.schema,
      appVersion,
      deviceId: getDeviceId(),
      repoId: randomId(),
      createdAt: now,
      updatedAt: now,
    }
    await api.writeFile(
      repoOwner,
      repo.name,
      "open-writer/meta.json",
      JSON.stringify(meta, null, 2),
      "Create Open Writer storage metadata"
    )
  }

  return {
    owner: repoOwner,
    name: repo.name,
    fullName: repo.full_name,
    meta,
    created: !meta,
  }
}
