/**
 * Minimal GitHub REST client — only the endpoints Open Writer needs.
 * Everything is plain fetch so it runs identically in the browser,
 * on GitHub Pages, and under the local mock server used by tests.
 */

export class GitHubApiError extends Error {
  status: number
  rateLimitRemaining: number | null
  rateLimitReset: number | null // epoch seconds

  constructor(
    message: string,
    status: number,
    rateLimitRemaining: number | null = null,
    rateLimitReset: number | null = null
  ) {
    super(message)
    this.name = "GitHubApiError"
    this.status = status
    this.rateLimitRemaining = rateLimitRemaining
    this.rateLimitReset = rateLimitReset
  }
}

export interface GitHubUser {
  login: string
  id: number
  name: string | null
  avatar_url: string | null
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  description: string | null
  default_branch: string
  pushed_at: string | null
  size: number
  owner?: { login: string }
}

export interface ContentEntry {
  name: string
  path: string
  type: "file" | "dir"
  sha: string
  size: number
}

export interface ApiCallStats {
  calls: number
  windowStartedAt: number
}

export class GitHubApi {
  constructor(
    private readonly apiBase: string,
    private readonly getToken: () => string | null,
    private readonly stats: ApiCallStats
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    tokenOverride?: string
  ): Promise<T> {
    const token = tokenOverride ?? this.getToken()
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    }
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers["Content-Type"] = "application/json"

    this.stats.calls += 1

    let res: Response
    try {
      res = await fetch(`${this.apiBase}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch (err) {
      throw new GitHubApiError(
        err instanceof Error ? `Network error: ${err.message}` : "Network error",
        0
      )
    }

    const remaining = res.headers.get("x-ratelimit-remaining")
      ? Number(res.headers.get("x-ratelimit-remaining"))
      : null
    const reset = res.headers.get("x-ratelimit-reset")
      ? Number(res.headers.get("x-ratelimit-reset"))
      : null

    if (res.status === 403 && remaining === 0) {
      throw new GitHubApiError("Rate limit reached", 403, remaining, reset)
    }
    if (res.status === 401) {
      throw new GitHubApiError("Authentication expired", 401, remaining, reset)
    }
    if (res.status === 404) {
      throw new GitHubApiError("Not found", 404, remaining, reset)
    }
    if (res.status === 422) {
      throw new GitHubApiError("Unprocessable entity", 422, remaining, reset)
    }
    if (!res.ok) {
      throw new GitHubApiError(
        `GitHub API ${res.status} ${res.statusText}`,
        res.status,
        remaining,
        reset
      )
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  /** Detect a 404 without throwing. */
  private async exists(method: string, path: string): Promise<boolean> {
    try {
      await this.request(method, path)
      return true
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) return false
      throw err
    }
  }

  getUser(): Promise<GitHubUser> {
    return this.request<GitHubUser>("GET", "/user")
  }

  getRepo(owner: string, repo: string): Promise<GitHubRepo | null> {
    return this.exists("GET", `/repos/${owner}/${repo}`)
      .then((ok) =>
        ok ? this.request<GitHubRepo>("GET", `/repos/${owner}/${repo}`) : null
      )
  }

  createPrivateRepo(name: string, description: string): Promise<GitHubRepo> {
    return this.request<GitHubRepo>("POST", "/user/repos", {
      name,
      description,
      private: true,
      auto_init: true,
      has_issues: false,
      has_wiki: false,
    })
  }

  listUserRepos(): Promise<GitHubRepo[]> {
    return this.request<GitHubRepo[]>("GET", "/user/repos?per_page=100&sort=updated")
  }

  readFile(owner: string, repo: string, path: string): Promise<string | null> {
    return this.exists("GET", `/repos/${owner}/${repo}/contents/${path}`).then(
      (ok) =>
        ok
          ? this.request<{ content: string; sha: string }>(
              "GET",
              `/repos/${owner}/${repo}/contents/${path}`
            ).then((f) => {
              const bin = atob(f.content.replace(/\n/g, ""))
              const bytes = new Uint8Array(bin.length)
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
              return new TextDecoder().decode(bytes)
            })
          : null
    )
  }

  readJson<T>(owner: string, repo: string, path: string): Promise<T | null> {
    return this.readFile(owner, repo, path).then((s) =>
      s === null ? null : (JSON.parse(s) as T)
    )
  }

  /**
   * Create or update a file. For updates the current sha must be supplied;
   * when omitted we fetch it (one extra call, only on collision).
   */
  async writeFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string
  ): Promise<void> {
    const b64 = btoa(
      Array.from(new TextEncoder().encode(content), (b) => String.fromCharCode(b)).join("")
    )
    try {
      await this.request("PUT", `/repos/${owner}/${repo}/contents/${path}`, {
        message,
        content: b64,
      })
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 422) {
        // File exists — fetch sha and retry as an update
        const existing = await this.request<{ sha: string }>(
          "GET",
          `/repos/${owner}/${repo}/contents/${path}`
        )
        await this.request("PUT", `/repos/${owner}/${repo}/contents/${path}`, {
          message,
          content: b64,
          sha: existing.sha,
        })
        return
      }
      throw err
    }
  }

  async writeFileBytes(
    owner: string,
    repo: string,
    path: string,
    bytes: Uint8Array,
    message: string
  ): Promise<void> {
    let bin = ""
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    const b64 = btoa(bin)
    try {
      await this.request("PUT", `/repos/${owner}/${repo}/contents/${path}`, {
        message,
        content: b64,
      })
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 422) {
        const existing = await this.request<{ sha: string }>(
          "GET",
          `/repos/${owner}/${repo}/contents/${path}`
        )
        await this.request("PUT", `/repos/${owner}/${repo}/contents/${path}`, {
          message,
          content: b64,
          sha: existing.sha,
        })
        return
      }
      throw err
    }
  }

  /** Read a chunk back as raw bytes. */
  async readFileBytes(
    owner: string,
    repo: string,
    path: string
  ): Promise<Uint8Array | null> {
    const exists = await this.exists("GET", `/repos/${owner}/${repo}/contents/${path}`)
    if (!exists) return null
    const file = await this.request<{ content: string }>(
      "GET",
      `/repos/${owner}/${repo}/contents/${path}`
    )
    const bin = atob(file.content.replace(/\n/g, ""))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  }

  async listDir(
    owner: string,
    repo: string,
    path: string
  ): Promise<ContentEntry[] | null> {
    const ok = await this.exists("GET", `/repos/${owner}/${repo}/contents/${path}`)
    if (!ok) return null
    return this.request<ContentEntry[]>(
      "GET",
      `/repos/${owner}/${repo}/contents/${path}`
    )
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string
  ): Promise<void> {
    const existing = await this.request<{ sha: string }>(
      "GET",
      `/repos/${owner}/${repo}/contents/${path}`
    )
    await this.request("DELETE", `/repos/${owner}/${repo}/contents/${path}`, {
      message,
      sha: existing.sha,
    })
  }

  /**
   * Full recursive tree of the default branch in one call. Used to merge
   * the remote chunk set into the local index so a second device does not
   * re-upload chunks the first device already stored (cross-device dedup).
   */
  async getTree(
    owner: string,
    repo: string
  ): Promise<{ path: string; type: string; size: number }[]> {
    try {
      const data = await this.request<{
        tree?: { path: string; type: string; size: number }[]
        truncated?: boolean
      }>("GET", `/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`)
      return (data.tree ?? []).filter((t) => t.type === "blob")
    } catch (err) {
      // Empty/uninitialized repo or legacy layout — treat as empty
      if (err instanceof GitHubApiError && (err.status === 404 || err.status === 409)) {
        return []
      }
      throw err
    }
  }
}
