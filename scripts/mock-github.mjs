/**
 * Mock GitHub server for headless verification of the sync engine.
 *
 * Implements exactly the endpoints Open Writer uses (OAuth device flow,
 * user, repos, contents, git trees) with GitHub-shaped responses,
 * including rate-limit headers. Files live in memory so a test can
 * inspect the "repository" directly.
 *
 * Usage: node scripts/mock-github.mjs [port]
 * Endpoints:
 *   POST /login/device/code          — device flow start
 *   POST /login/oauth/access_token   — device/refresh token exchange
 *   GET  /user                       — current user
 *   GET  /user/repos                 — list repos
 *   POST /user/repos                 — create repo
 *   GET  /repos/:owner/:repo         — repo info
 *   GET/PUT/DELETE /repos/:owner/:repo/contents/* — file ops
 *   GET  /repos/:owner/:repo/git/trees/HEAD?recursive=1 — full tree
 *   POST /repos/:owner/:repo/disconnect — test-only: revoke the token
 */

import http from "node:http"

const port = Number(process.argv[2] || 9801)
const files = new Map() // `${owner}/${repo}/${path}` → { content: string, sha }
const repos = new Map() // `${owner}/${repo}` → { name, full_name, private, description }
const devices = new Map() // device_code → { user_code, authorized, expiresAt }
const refreshTokens = new Map() // refresh_token → access_token
let nextSha = 1
const users = [
  { login: "testwriter", id: 1001, name: "Test Writer", avatar_url: null },
  { login: "secondwriter", id: 1002, name: "Second Writer", avatar_url: null },
]
let activeUser = users[0]

function makeSha() {
  return (nextSha++).toString(16).padStart(8, "0") + "ab".repeat(16)
}

function json(res, status, body, extra = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "X-Ratelimit-Limit": "5000",
    "X-Ratelimit-Remaining": "4990",
    "X-Ratelimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
    ...extra,
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ""
    req.on("data", (c) => (data += c))
    req.on("end", () => resolve(data))
  })
}

function pathParts(pathname) {
  return pathname.split("/").filter(Boolean)
}

function decodeContent(file) {
  return Buffer.from(file.content, "base64").toString("utf8")
}

function encodeContent(text) {
  return Buffer.from(text, "utf8").toString("base64")
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const parts = pathParts(url.pathname)
  const method = req.method
  const auth = req.headers.authorization || ""
  const token = auth.replace(/^Bearer /, "")

  // CORS — the mock is only used for local verification
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-GitHub-Api-Version")
  if (method === "OPTIONS") {
    res.writeHead(204)
    return res.end()
  }

  // ── OAuth device flow ──────────────────────────────────────────────
  if (url.pathname === "/login/device/code" && method === "POST") {
    const body = await readBody(req)
    const params = new URLSearchParams(body)
    if (!params.get("client_id")) {
      return json(res, 400, { error: "incorrect_client_credentials" })
    }
    const userCode = `TEST-${Math.floor(1000 + Math.random() * 9000)}`
    const deviceCode = `DEVICE-${Math.random().toString(16).slice(2, 12)}`
    devices.set(deviceCode, {
      userCode,
      authorized: false,
      expiresAt: Date.now() + 900_000,
    })
    return json(res, 200, {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: "http://127.0.0.1:9801/login/device",
      verification_uri_complete: `http://127.0.0.1:9801/login/device?user_code=${userCode}`,
      expires_in: 900,
      interval: 1,
    })
  }

  if (url.pathname === "/login/oauth/access_token" && method === "POST") {
    const body = await readBody(req)
    const params = new URLSearchParams(body)
    const grant = params.get("grant_type")
    if (grant === "urn:ietf:params:oauth:grant-type:device_code") {
      const dev = devices.get(params.get("device_code"))
      if (!dev) return json(res, 400, { error: "incorrect_device_code" })
      if (Date.now() > dev.expiresAt) return json(res, 400, { error: "expired_token" })
      if (!dev.authorized) return json(res, 400, { error: "authorization_pending" })
      // authorize via test hook: POST /login/device/authorize
      const access = `ghu_test_${Math.random().toString(16).slice(2)}`
      const refresh = `ghr_test_${Math.random().toString(16).slice(2)}`
      refreshTokens.set(refresh, access)
      return json(res, 200, {
        access_token: access,
        token_type: "bearer",
        expires_in: 28800,
        refresh_token: refresh,
        refresh_token_expires_in: 15897600,
        scope: "",
      })
    }
    if (grant === "refresh_token") {
      const access = refreshTokens.get(params.get("refresh_token"))
      if (!access) return json(res, 400, { error: "bad_refresh_token" })
      return json(res, 200, {
        access_token: access,
        token_type: "bearer",
        expires_in: 28800,
        scope: "",
      })
    }
    return json(res, 400, { error: "unsupported_grant_type" })
  }

  // Test hook: authorize the device flow
  if (url.pathname === "/login/device/authorize" && method === "POST") {
    const body = await readBody(req)
    const userCode = new URLSearchParams(body).get("user_code")
    for (const [code, dev] of devices) {
      if (dev.userCode === userCode) dev.authorized = true
    }
    return json(res, 200, { ok: true })
  }

  // Test hook: revoke the current token (simulates expiry)
  if (url.pathname === "/logout" && method === "POST") {
    activeUser = users[0]
    return json(res, 204, null)
  }

  // ── User ────────────────────────────────────────────────────────────
  if (url.pathname === "/user" && method === "GET") {
    if (!token.startsWith("ghu_test_") && !token.startsWith("pat_test_")) {
      return json(res, 401, { message: "Bad credentials" })
    }
    return json(res, 200, activeUser)
  }

  // ── Repos ───────────────────────────────────────────────────────────
  if (url.pathname === "/user/repos" && method === "GET") {
    return json(res, 200, Array.from(repos.values()))
  }
  if (url.pathname === "/user/repos" && method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}")
    const name = body.name || "unnamed"
    const key = `${activeUser.login}/${name}`
    if (repos.has(key)) return json(res, 422, { message: "Repository already exists" })
    const repo = {
      id: repos.size + 500,
      name,
      full_name: key,
      private: body.private !== false,
      description: body.description || null,
      default_branch: "main",
      pushed_at: new Date().toISOString(),
      size: 0,
      owner: { login: activeUser.login },
    }
    repos.set(key, repo)
    return json(res, 201, repo)
  }

  const repoMatch = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/?$/)
  if (repoMatch && method === "GET") {
    const key = `${repoMatch[1]}/${repoMatch[2]}`
    const repo = repos.get(key)
    if (!repo) return json(res, 404, { message: "Not Found" })
    return json(res, 200, repo)
  }

  // ── Git trees ───────────────────────────────────────────────────────
  const treeMatch = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/git\/trees\/HEAD$/)
  if (treeMatch && method === "GET") {
    const key = `${treeMatch[1]}/${treeMatch[2]}`
    if (!repos.has(key)) return json(res, 404, { message: "Not Found" })
    const prefix = `${treeMatch[1]}/${treeMatch[2]}/`
    const tree = []
    for (const [fileKey, file] of files) {
      if (fileKey.startsWith(prefix)) {
        tree.push({
          path: fileKey.slice(prefix.length),
          type: "blob",
          size: file.content.length,
          sha: file.sha,
        })
      }
    }
    return json(res, 200, { sha: "tree-sha", tree, truncated: false })
  }

  // ── Contents API ────────────────────────────────────────────────────
  const contentsMatch = url.pathname.match(
    /^\/repos\/([^/]+)\/([^/]+)\/contents\/(.+)$/
  )
  if (contentsMatch) {
    const [, owner, repoName, rawPath] = contentsMatch
    const fileKey = `${owner}/${repoName}/${rawPath}`
    if (method === "GET") {
      const file = files.get(fileKey)
      if (!file) return json(res, 404, { message: "Not Found" })
      return json(res, 200, {
        name: rawPath.split("/").pop(),
        path: rawPath,
        type: "file",
        sha: file.sha,
        size: file.content.length,
        content: file.content,
        encoding: "base64",
      })
    }
    if (method === "PUT") {
      const body = JSON.parse((await readBody(req)) || "{}")
      const existing = files.get(fileKey)
      if (existing && body.sha && body.sha !== existing.sha) {
        return json(res, 409, { message: "sha mismatch" })
      }
      if (existing && !body.sha) {
        return json(res, 422, { message: "sha wasn't supplied" })
      }
      const fileSha = existing ? existing.sha : makeSha()
      files.set(fileKey, { content: body.content, sha: fileSha })
      const repo = repos.get(`${owner}/${repoName}`)
      if (repo) repo.pushed_at = new Date().toISOString()
      return json(res, 200, { content: { sha: fileSha }, commit: { sha: makeSha() } })
    }
    if (method === "DELETE") {
      const body = JSON.parse((await readBody(req)) || "{}")
      const existing = files.get(fileKey)
      if (!existing) return json(res, 404, { message: "Not Found" })
      if (body.sha && body.sha !== existing.sha) {
        return json(res, 409, { message: "sha mismatch" })
      }
      files.delete(fileKey)
      return json(res, 200, { commit: { sha: makeSha() } })
    }
  }

  return json(res, 404, { message: `No route ${method} ${url.pathname}` })
})

server.listen(port, "127.0.0.1", () => {
  console.log(`mock-github listening on http://127.0.0.1:${port}`)
})

export { files, repos, server }
