// Phase 10 PWA offline verification (robust).
// Usage: node scripts/test-offline.mjs
// The static server must be running on 4173; the script kills it mid-test.
import { spawn, execSync } from "node:child_process"
import { execFileSync } from "node:child_process"
import { rmSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const PORT = 4173
const BASE = `http://127.0.0.1:${PORT}/open-writer/`
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const PROFILE = join(process.env.TEMP || "/tmp", "ow-offline-profile-2")
const DEBUG_PORT = 9444

let pass = 0
let fail = 0
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

try { execSync(`taskkill //IM chrome.exe //F`, { stdio: "ignore" }) } catch {}
rmSync(PROFILE, { recursive: true, force: true })
mkdirSync(PROFILE, { recursive: true })

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE}`,
  "--window-size=1400,900",
  BASE,
], { stdio: "ignore" })

async function getTargets() {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)
  return res.json()
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  }
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id
    pending.set(mid, res)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
  return { ws, send }
}

async function evalIn(send, expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })
  if (r?.result?.exceptionDetails) return { __exception: r.result.exceptionDetails.text }
  return r?.result?.result?.value
}

try {
  let targets = []
  for (let i = 0; i < 40; i++) {
    try { targets = await getTargets(); if (targets.length) break } catch {}
    await sleep(500)
  }
  check("Chrome launched with app tab", targets.length > 0)
  const page = targets.find((t) => t.type === "page")
  const { ws, send } = await connect(page.webSocketDebuggerUrl)
  await send("Runtime.enable")

  // Wait for the app shell to actually render (React hydrated)
  let appShell = false
  for (let i = 0; i < 60; i++) {
    const v = await evalIn(send, `document.body && document.body.innerText.includes('Create New Project')`)
    if (v === true) { appShell = true; break }
    await sleep(1000)
  }
  check("app shell rendered (React hydrated)", appShell)
  await sleep(3000) // SW precache

  // SW + cache state
  const cache = await evalIn(send, `(async () => {
    const names = await caches.keys()
    const counts = {}
    for (const n of names) { const c = await caches.open(n); counts[n] = (await c.keys()).length }
    const regs = await navigator.serviceWorker.getRegistrations()
    return { caches: counts, swActive: regs.some(r => !!r.active) }
  })()`)
  check("service worker registered and active", cache?.swActive === true, JSON.stringify(cache))
  check("app shell precached (>= 50 entries)", Object.values(cache?.caches ?? {}).some((n) => n >= 50), JSON.stringify(cache?.caches))

  // Create data while online
  const created = await evalIn(send, `(async () => {
    const r = await fetch('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Offline Gate Test' }) })
    const d = await r.json()
    return { status: r.status, id: d.id, err: d.error }
  })()`)
  check("created project while online", created?.status === 201, JSON.stringify(created))
  const projectId = created?.id
  await sleep(500)

  // Kill the server — offline now (parse netstat in Node; cmd.exe has no grep)
  console.log("  — killing static server (offline) —")
  try {
    const out = execFileSync("netstat", ["-ano"], { encoding: "utf8" })
    const line = out.split(/\r?\n/).find((l) => l.includes(`:${PORT}`) && l.includes("LISTENING"))
    const pid = line?.trim().split(/\s+/).pop()
    if (pid) {
      execFileSync("taskkill", ["/PID", pid, "/F"], { stdio: "ignore" })
      console.log(`  — killed server pid ${pid}`)
    }
  } catch (e) {
    console.log("  — server kill note:", String(e).slice(0, 120))
  }
  await sleep(1500)

  let netDown = true
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/`, { signal: AbortSignal.timeout(1500) })
    netDown = !r.ok
  } catch { netDown = true }
  check("server is unreachable (network dead)", netDown)

  // Reload — SW must serve the shell from cache
  await send("Page.enable")
  await send("Page.reload", { ignoreCache: true })

  // Wait for React hydration (local-api shim installed) before API probes
  let shimReady = false
  for (let i = 0; i < 60; i++) {
    const v = await evalIn(send, `(async () => {
      try {
        const r = await fetch('/api/projects')
        const t = await r.text()
        return t.startsWith('[') || t.startsWith('{')
      } catch { return false }
    })()`)
    if (v === true) { shimReady = true; break }
    await sleep(1000)
  }
  check("local API ready after offline reload", shimReady)

  const offline = await evalIn(send, `(async () => {
    const html = document.documentElement.outerHTML
    let apiOk = false, dataOk = false, writeOk = false
    try {
      const r = await fetch('/api/projects')
      const t = await r.text()
      apiOk = t.startsWith('[') || t.startsWith('{')
      dataOk = t.includes('Offline Gate Test')
    } catch {}
    try {
      const r = await fetch('/api/notes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: ${JSON.stringify(projectId)}, title: 'Note written offline', content: 'survives' }) })
      writeOk = r.status === 201
    } catch {}
    return { rendered: html.includes('Create New Project'), apiOk, dataOk, writeOk }
  })()`)
  check("app shell renders offline (SW cache)", offline?.rendered === true, JSON.stringify(offline))
  check("local API works offline (no network)", offline?.apiOk === true)
  check("created project survived offline reload", offline?.dataOk === true, JSON.stringify(offline))
  check("can write while offline", offline?.writeOk === true, JSON.stringify(offline))

  console.log(`\nOffline: ${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
} catch (e) {
  console.error("offline test error:", e)
  process.exit(1)
} finally {
  try { execSync(`taskkill //IM chrome.exe //F`, { stdio: "ignore" }) } catch {}
}
