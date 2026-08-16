/**
 * One-click GitHub App registrar for Open Writer.
 *
 * GitHub Apps can only be created through the interactive manifest flow
 * (there is no API to create them), so this script makes that flow as
 * close to one click as possible:
 *
 *   1. starts a local callback server on 127.0.0.1:<port>
 *   2. builds the app manifest (correct permissions, callback URL)
 *   3. opens https://github.com/settings/apps/new?manifest=… in your browser
 *   4. you name the app (optional) and click "Create GitHub App"
 *   5. GitHub redirects to the local callback with a temporary code
 *   6. the script exchanges the code for the app credentials, prints the
 *      client id, writes it to .env.local (NEXT_PUBLIC_SYNC_CLIENT_ID),
 *      and reminds you to enable Device Flow in the app's settings
 *
 * Only the client id is needed: the device flow needs no secret, so
 * nothing sensitive is stored or committed. The client secret / private
 * key belong to the app owner and stay in your GitHub account.
 *
 * Usage:
 *   node scripts/register-github-app.mjs [port]
 *   API_BASE=http://127.0.0.1:9801 node scripts/register-github-app.mjs 9876  # against the local mock (tests)
 */

import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.argv[2] || 9876)
const API_BASE = process.env.API_BASE || "https://api.github.com"
const WEB_BASE = process.env.WEB_BASE || "https://github.com"
const HOMEPAGE = process.env.APP_URL || "https://alot1z.github.io/open-writer/"
const CALLBACK = `http://127.0.0.1:${PORT}/callback`

const manifest = {
  name: "Open Writer Storage",
  url: HOMEPAGE,
  redirect_url: CALLBACK,
  callback_urls: [CALLBACK],
  description:
    "Private cloud storage for Open Writer — created automatically by the Open Writer registrar. Enable Device Flow in the app settings so one-click Connect GitHub works on GitHub Pages.",
  public: false,
  request_oauth_on_install: true,
  default_permissions: {
    contents: "write",
    metadata: "read",
  },
  default_events: [],
  // NOTE: no hook_attributes on purpose. GitHub's manifest form ignores the
  // webhook from hook_attributes and shows a blank form when it is present;
  // without it, GitHub prefills the Webhook URL from the homepage URL
  // ({homepage}/hooks), which satisfies the required field.
}

const manifestUrl = `${WEB_BASE}/settings/apps/new?manifest=${encodeURIComponent(
  JSON.stringify(manifest)
)}`

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code")
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    if (!code) {
      res.end("<h1>No code received</h1>")
      return
    }
    res.end(
      `<h1>App registered</h1><p>Credentials captured — you can close this tab.</p>`
    )
    console.log(`\n[1/3] Received manifest code from GitHub.`)
    await exchange(code)
    return
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
  res.end(
    `<h1>Open Writer — GitHub App registrar</h1><p>Open this URL in a browser where you are signed in to GitHub:</p>` +
      `<p><a href="${manifestUrl}">${manifestUrl}</a></p>` +
      `<p>Then click <strong>Create GitHub App</strong>. You will be redirected back here automatically.</p>`
  )
})

async function exchange(code) {
  try {
    const res = await fetch(`${API_BASE}/app-manifests/${code}/conversions`, {
      method: "POST",
      headers: { Accept: "application/vnd.github+json" },
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(
        `[!] Conversion failed (${res.status}). ` +
          (res.status === 404
            ? "The code was not accepted — the manifest code expires after one hour; run the registrar again."
            : body.slice(0, 300))
      )
      process.exitCode = 1
      server.close()
      return
    }
    const app = await res.json()
    const clientId = app.client_id
    console.log(`[2/3] GitHub App created:`)
    console.log(`   name        : ${app.name}`)
    console.log(`   slug        : ${app.slug}`)
    console.log(`   app id      : ${app.id}`)
    console.log(`   client id   : ${clientId}`)
    console.log(`   client secret: ${app.client_secret ? "<yours, stored in GitHub>" : "(none)"}`)

    // Only the client id is needed for the device flow — never the secret.
    const envPath = path.join(__dirname, "..", ".env.local")
    const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : ""
    const lines = existing
      .split(/\r?\n/)
      .filter((l) => !l.startsWith("NEXT_PUBLIC_SYNC_CLIENT_ID="))
    lines.push(`NEXT_PUBLIC_SYNC_CLIENT_ID=${clientId}`)
    fs.writeFileSync(envPath, lines.join("\n").trimEnd() + "\n")
    console.log(`[3/3] Wrote NEXT_PUBLIC_SYNC_CLIENT_ID to .env.local`)

    console.log(`\nNext step — enable Device Flow (one checkbox):`)
    console.log(`   open  https://github.com/settings/apps/${app.slug}`)
    console.log(`   tick  "Enable Device Flow"`)
    console.log(`   press Save changes`)
    console.log(`\nThen rebuild with:  NEXT_PUBLIC_BASE_PATH=/open-writer bun run build`)
  } catch (err) {
    console.error(`[!] Conversion request failed: ${err.message}`)
    process.exitCode = 1
  }
  server.close()
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Registrar callback listening on http://127.0.0.1:${PORT}`)
  console.log(`Manifest URL:\n  ${manifestUrl}\n`)
  if (process.env.NO_OPEN === "1") {
    console.log("NO_OPEN=1 — not opening the browser; the page is already open.")
    return
  }
  try {
    if (process.platform === "win32") {
      execSync(`powershell -NoProfile -Command "Start-Process '${manifestUrl}'"`)
    } else {
      execSync(`open "${manifestUrl}"`)
    }
    console.log("Opened the registration page in your default browser.")
  } catch {
    console.log("Could not auto-open the browser — open the Manifest URL manually.")
  }
})
