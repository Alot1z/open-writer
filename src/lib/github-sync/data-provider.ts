/**
 * The sync engine never touches storage directly. A SyncDataProvider is
 * the single seam between the engine and the local data layer, so the
 * same engine runs in the browser (IndexedDB) and in headless tests
 * (in-memory), with identical semantics.
 */

export interface ProjectMeta {
  id: string
  name: string
  updatedAt: string
}

export interface SyncDataProvider {
  /** All local projects (used to build the remote index). */
  listProjects(): Promise<ProjectMeta[]>
  /** Full JSON payload for a project (project record + every store row). */
  exportProject(id: string): Promise<string>
  /**
   * Replace the local copy of a project with the given payload, keeping
   * every other project's data intact.
   */
  importProject(id: string, payload: string): Promise<void>
  /** Import a payload under a new project id (used for "Save both"). */
  importAsNewProject(id: string, name: string, payload: string): Promise<ProjectMeta>
}

import { getAll, replaceStore } from "@/lib/local-api/storage"
import { STORES, StoreName } from "@/lib/local-api/storage"
import { randomId } from "./crypto"

export class IndexedDBDataProvider implements SyncDataProvider {
  async listProjects(): Promise<ProjectMeta[]> {
    const rows = await getAll<ProjectMeta & { name?: string }>("projects")
    return rows
      .map((p) => ({ id: p.id, name: p.name ?? "Untitled", updatedAt: p.updatedAt ?? "" }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }

  async exportProject(id: string): Promise<string> {
    const stores: Record<string, unknown[]> = {}
    for (const store of STORES) {
      const rows = await getAll<Record<string, unknown>>(store)
      if (store === "projects") {
        stores[store] = rows.filter((r) => r.id === id)
      } else {
        stores[store] = rows.filter((r) => r.projectId === id)
      }
    }
    const project = stores["projects"]?.[0] ?? null
    if (!project) throw new Error("Project not found locally")
    return JSON.stringify({ schema: 1, project, stores })
  }

  async importProject(id: string, payload: string): Promise<void> {
    const parsed = JSON.parse(payload) as {
      project?: Record<string, unknown>
      stores?: Record<string, unknown[]>
    }
    const project = parsed.project ?? { id }
    // Ensure the project record itself is present
    await this.applyStores(id, project, parsed.stores ?? {})
  }

  async importAsNewProject(id: string, name: string, payload: string): Promise<ProjectMeta> {
    const parsed = JSON.parse(payload) as {
      project?: Record<string, unknown>
      stores?: Record<string, unknown[]>
    }
    const sourceProject = parsed.project ?? {}
    const now = new Date().toISOString()
    const project = {
      ...sourceProject,
      id,
      name: sourceProject.name ? `${sourceProject.name} (copy)` : name,
      updatedAt: now,
      createdAt: sourceProject.createdAt ?? now,
    }
    await this.applyStores(id, project, parsed.stores ?? {})
    return { id, name: String(project.name ?? name), updatedAt: now }
  }

  private async applyStores(
    id: string,
    project: Record<string, unknown>,
    stores: Record<string, unknown[]>
  ): Promise<void> {
    // Remap child rows to the new id while keeping their own id
    for (const store of STORES) {
      const incoming = (stores[store] ?? []) as Record<string, unknown>[]
      if (store === "projects") {
        await replaceStore("projects", [project])
        continue
      }
      const otherRows = (await getAll<Record<string, unknown>>(store)).filter(
        (r) => r.projectId !== id
      )
      const remapped = incoming.map((row) => ({ ...row, projectId: id }))
      await replaceStore(store, [...otherRows, ...remapped])
    }
  }
}

/** In-memory provider for headless tests and the local mock server. */
export class MemoryDataProvider implements SyncDataProvider {
  private data = new Map<string, { meta: ProjectMeta; payload: string }>()

  seed(id: string, name: string, payload: string): void {
    this.data.set(id, {
      meta: { id, name, updatedAt: new Date().toISOString() },
      payload,
    })
  }

  get raw(): Map<string, { meta: ProjectMeta; payload: string }> {
    return this.data
  }

  async listProjects(): Promise<ProjectMeta[]> {
    return Array.from(this.data.values())
      .map((d) => d.meta)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }

  async exportProject(id: string): Promise<string> {
    const row = this.data.get(id)
    if (!row) throw new Error("Project not found locally")
    return row.payload
  }

  async importProject(id: string, payload: string): Promise<void> {
    const existing = this.data.get(id)
    this.data.set(id, {
      meta: existing?.meta ?? { id, name: "Imported", updatedAt: new Date().toISOString() },
      payload,
    })
  }

  async importAsNewProject(id: string, name: string, payload: string): Promise<ProjectMeta> {
    const meta: ProjectMeta = { id, name: `${name} (copy)`, updatedAt: new Date().toISOString() }
    this.data.set(id, { meta, payload })
    return meta
  }

  /** Helper used by tests to mutate the local copy like the app would. */
  mutate(id: string, mutate: (payload: string) => string): void {
    const row = this.data.get(id)
    if (!row) throw new Error("Missing project")
    const next = mutate(row.payload)
    this.data.set(id, {
      meta: { ...row.meta, updatedAt: new Date().toISOString() },
      payload: next,
    })
  }
}
