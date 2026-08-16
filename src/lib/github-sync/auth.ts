/**
 * GitHub authorization for Open Writer.
 *
 * Primary flow: OAuth device flow (works on GitHub Pages with no server,
 * no redirect URLs, no secrets in the frontend). The user visits the
 * verification URL, types a short code, and Open Writer receives a
 * short-lived user token plus a refresh token.
 *
 * Fallback flow: one-time fine-grained personal access token paste,
 * used when the device-flow client id is not configured.
 *
 * Tokens never touch localStorage, project data, manifests, logs or the
 * bundle. They live in memory and sessionStorage only (cleared when the
 * tab closes) and are re-obtained via the refresh token / re-auth.
 */

import { GitHubApi, GitHubApiError, GitHubUser } from "./api"

export interface DeviceFlowStart {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}

export interface TokenResponse {
  access_token?: string
  token_type?: string
  scope?: string
  expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
  error?: string
  error_description?: string
}

export type AuthMethod = "device-flow" | "token"

interface TokenRecord {
  accessToken: string
  refreshToken?: string
  expiresAt?: number // epoch ms
  method: AuthMethod
}

const SESSION_KEY = "openwriter-github-token"

function readSession(): TokenRecord | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as TokenRecord) : null
  } catch {
    return null
  }
}

function writeSession(record: TokenRecord): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(record))
  } catch {
    // Private mode or blocked storage — memory-only session
  }
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* noop */
  }
}

export class GitHubAuth {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private expiresAt: number | null = null
  private method: AuthMethod = "token"
  user: GitHubUser | null = null

  constructor(
    private readonly clientId: string,
    private readonly apiBase: string,
    private readonly webBase: string,
    private readonly stats: { calls: number; windowStartedAt: number }
  ) {}

  /** True when a usable token is present (or restorable from session). */
  get isConnected(): boolean {
    return this.accessToken !== null
  }

  /** Token for API requests (null when not connected). */
  getToken(): string | null {
    return this.accessToken
  }

  getMethod(): AuthMethod {
    return this.method
  }

  get isDeviceFlowAvailable(): boolean {
    return this.clientId.length > 0
  }

  /** Restore a session saved earlier (same tab). Returns true if connected. */
  async restoreSession(): Promise<boolean> {
    const record = readSession()
    if (!record) return false
    this.accessToken = record.accessToken
    this.refreshToken = record.refreshToken ?? null
    this.expiresAt = record.expiresAt ?? null
    this.method = record.method

    if (this.expiresAt && Date.now() >= this.expiresAt) {
      if (this.refreshToken) {
        try {
          await this.refresh()
          return true
        } catch {
          this.clear()
          return false
        }
      }
      this.clear()
      return false
    }
    try {
      this.user = await this.getApi().getUser()
      return true
    } catch {
      this.clear()
      return false
    }
  }

  private getApi(): GitHubApi {
    return new GitHubApi(this.apiBase, () => this.accessToken, this.stats)
  }

  /** Start the device flow. Returns the code the user must enter. */
  async startDeviceFlow(): Promise<DeviceFlowStart> {
    const url = `${this.webBase}/login/device/code`
    const body = new URLSearchParams({ client_id: this.clientId })
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
      body,
    })
    if (!res.ok) {
      throw new Error(
        `GitHub could not start the device flow (${res.status}). ` +
          (res.status === 404 ? "The GitHub App may not be registered." : "")
      )
    }
    const data = (await res.json()) as DeviceFlowStart & {
      error?: string
      error_description?: string
    }
    if (data.error) throw new Error(data.error_description ?? data.error)
    return data
  }

  /** Poll for the user's authorization. Throws until authorized/expired. */
  async pollDeviceFlow(deviceCode: string, interval: number): Promise<void> {
    const url = `${this.webBase}/login/oauth/access_token`
    const body = new URLSearchParams({
      client_id: this.clientId,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    })
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
      body,
    })
    const data = (await res.json()) as TokenResponse
    if (data.error) {
      const err = new Error(data.error_description ?? data.error)
      ;(err as Error & { code?: string }).code = data.error
      throw err
    }
    if (!data.access_token) throw new Error("GitHub returned no token")
    this.setTokens(data.access_token, data.refresh_token, data.expires_in, "device-flow")
    this.user = await this.getApi().getUser()
  }

  private setTokens(
    accessToken: string,
    refreshToken: string | undefined,
    expiresIn: number | undefined,
    method: AuthMethod
  ): void {
    this.accessToken = accessToken
    this.refreshToken = refreshToken ?? null
    this.expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : null
    this.method = method
    writeSession({
      accessToken,
      refreshToken,
      expiresAt: this.expiresAt ?? undefined,
      method,
    })
  }

  /** Refresh a device-flow token before it expires. */
  async refresh(): Promise<void> {
    if (!this.refreshToken) throw new Error("No refresh token")
    const url = `${this.webBase}/login/oauth/access_token`
    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
    })
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
      body,
    })
    const data = (await res.json()) as TokenResponse
    if (data.error) throw new Error(data.error_description ?? data.error)
    this.setTokens(data.access_token ?? "", data.refresh_token, data.expires_in, "device-flow")
  }

  /** Fallback: connect with a pasted personal access token. */
  async connectWithToken(token: string): Promise<GitHubUser> {
    const trimmed = token.trim()
    if (!trimmed) throw new Error("Enter a token first")
    this.accessToken = trimmed
    this.method = "token"
    try {
      const user = await this.getApi().getUser()
      this.user = user
      this.expiresAt = null
      this.refreshToken = null
      writeSession({ accessToken: trimmed, method: "token" })
      return user
    } catch (err) {
      this.accessToken = null
      if (err instanceof GitHubApiError && err.status === 401) {
        throw new Error("That token was not accepted by GitHub. Check its permissions and try again.")
      }
      throw err
    }
  }

  /** Sign out on this device. Remote storage is left untouched. */
  clear(): void {
    this.accessToken = null
    this.refreshToken = null
    this.expiresAt = null
    this.user = null
    clearSession()
  }
}
