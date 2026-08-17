// Phase 11 accessibility audit: real axe-core run against the served app.
// Usage: node scripts/axe-audit.mjs  (serves out/ on 4174 itself)
import { spawn, execFileSync } from "node:child_process"
import { rmSync, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const PORT = 4174
const BASE = `http://127.0.0.1:${PORT}/open-writer/`
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const PROFILE = join(process.env.TEMP || "/tmp", "ow-axe-profile")
const DEBUG_PORT = 9451

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

rmSync(PROFILE, { recursive: true, force: true })
mkdirSync(PROFILE, { recursive: true })

// Static server
const server = spawn("node", ["scripts/static-serve.mjs", "out", String(PORT)], {
  stdio: "ignore",
  detached: true,
})
await sleep(1500)

// Chrome via CDP
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate,OptimizationHints",
    "--headless=new",
    "--no-sandbox",
    BASE,
  ],
  { stdio: "ignore", detached: true }
)
await sleep(2500)

async function getTargets() {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
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

let pass = 0
let fail = 0
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`) }
}

try {
  let targets = []
  for (let i = 0; i < 40; i++) {
    try { targets = await getTargets(); if (targets.length) break } catch {}
    await sleep(500)
  }
  const page = targets.find((t) => t.type === "page")
  if (!page) throw new Error("No page target")
  const { ws, send } = await connect(page.webSocketDebuggerUrl)
  await send("Runtime.enable")

  // Wait for React hydration
  let shell = false
  for (let i = 0; i < 60; i++) {
    const v = await evalIn(send, `document.body && document.body.innerText.includes('New Project') || document.body.innerText.includes('Create New Project')`)
    if (v === true) { shell = true; break }
    await sleep(1000)
  }
  check("app shell rendered (React hydrated)", shell)

  // Load axe-core from node_modules into the page
  const axeSrc = readFileSync(join(process.cwd(), "node_modules/axe-core/axe.min.js"), "utf8")
  const loaded = await evalIn(send, `${axeSrc}; typeof window.axe === 'object'`)
  check("axe-core injected", loaded === true)

  // Run axe on the project picker
  const res = await evalIn(send, `(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations', 'incomplete'] })
    return {
      violations: r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 5).map(n => n.target.join(' ')) })),
      incomplete: r.incomplete.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    }
  })()`)
  check("project picker: zero axe violations", (res?.violations?.length ?? 1) === 0)
  for (const v of res?.violations ?? []) {
    console.log(`  🚨 [${v.impact}] ${v.id}: ${v.help} (${v.nodes} nodes)`)
    for (const t of v.targets) console.log(`       ${t}`)
  }
  if ((res?.incomplete ?? []).length) {
    console.log(`  ⚠ incomplete checks: ${res.incomplete.map((i) => `${i.id}(${i.nodes})`).join(", ")}`)
  }

  // Unnamed interactive controls
  const unnamed = await evalIn(send, `(async () => {
    const sel = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]'
    const el = Array.from(document.querySelectorAll(sel))
    return el.filter((n) => {
      const label = (n.getAttribute('aria-label') || '') + (n.textContent || '') + (n.getAttribute('placeholder') || '')
      return label.trim().length === 0
    }).length
  })()`)
  check("project picker: no unnamed interactive controls", unnamed === 0, `(found ${unnamed})`)

  // Keyboard reachability: all interactive controls focusable via Tab
  const kb = await evalIn(send, `(async () => {
    const tabs = Array.from(document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'))
    const hidden = tabs.filter(n => {
      const r = n.getBoundingClientRect()
      const s = getComputedStyle(n)
      return r.width === 0 || r.height === 0 || s.display === 'none' || s.visibility === 'hidden' || n.disabled
    })
    return { total: tabs.length, hidden }
  })()`)
  console.log(`  ℹ interactive controls on picker: ${kb?.total} (${kb?.hidden?.length ?? "?"} hidden by design)`)

  // ── Writer view: create a project, open a scene, re-run axe ──────────
  console.log("\n=== AXE on writer view ===")
  // Wait for the local-API shim to be installed (fetch of /api/* then returns JSON, not HTML)
  let shim = false
  for (let i = 0; i < 40; i++) {
    const probe = await evalIn(send, `(async () => {
      const r = await fetch('/api/projects', { headers: { accept: 'application/json' } })
      const ct = r.headers.get('content-type') || ''
      return ct.includes('application/json')
    })()`)
    if (probe === true) { shim = true; break }
    await sleep(1000)
  }
  check("local API shim ready", shim)

  // Create the project through the real UI flow (picker → Create New Project dialog)
  const createClicked = await evalIn(send, `(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const b = btns.find(x => x.textContent && x.textContent.includes('Create New Project'))
    if (b) b.click()
    return !!b
  })()`)
  check("Create New Project button found", createClicked === true)
  await sleep(1200)
  const typed = await evalIn(send, `(() => {
    const input = Array.from(document.querySelectorAll('input')).find(i => i.placeholder && i.placeholder.includes('Project name'))
    if (!input) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, 'A11y Audit Project')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  check("typed project name in dialog", typed === true)
  await sleep(600)
  const confirmed = await evalIn(send, `(() => {
    const dialog = Array.from(document.querySelectorAll('[role=dialog]'))[0]
    const btns = Array.from((dialog || document).querySelectorAll('button'))
    const b = btns.find(x => x.textContent && x.textContent.trim().toLowerCase() === 'create')
    if (b) b.click()
    return !!b
  })()`)
  check("confirmed project creation", confirmed === true)
  await sleep(2500)

  let writerShell = false
  for (let i = 0; i < 20; i++) {
    const v = await evalIn(send, `document.querySelector('main') !== null && document.body.innerText.includes('A11y Audit Project')`)
    if (v === true) { writerShell = true; break }
    await sleep(1000)
  }
  check("writer shell opened", writerShell === true)

  const res2 = await evalIn(send, `(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations', 'incomplete'] })
    return {
      violations: r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 5).map(n => n.target.join(' ')) })),
      incomplete: r.incomplete.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    }
  })()`)
  check("writer view: zero axe violations", (res2?.violations?.length ?? 1) === 0)
  for (const v of res2?.violations ?? []) {
    console.log(`  🚨 [${v.impact}] ${v.id}: ${v.help} (${v.nodes} nodes)`)
    for (const t of v.targets) console.log(`       ${t}`)
  }
  if ((res2?.incomplete ?? []).length) {
    console.log(`  ⚠ incomplete: ${res2.incomplete.map((i) => `${i.id}(${i.nodes})`).join(", ")}`)
  }

  // Unnamed controls in writer view
  const unnamed2 = await evalIn(send, `(async () => {
    const sel = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]'
    const el = Array.from(document.querySelectorAll(sel))
    return el.filter((n) => {
      const label = (n.getAttribute('aria-label') || '') + (n.textContent || '') + (n.getAttribute('placeholder') || '')
      return label.trim().length === 0
    }).length
  })()`)
  check("writer view: no unnamed interactive controls", unnamed2 === 0, `(found ${unnamed2})`)

  await ws.close()
} finally {
  try { chrome.kill() } catch {}
  try { server.kill() } catch {}
}

console.log(`\nAXE AUDIT: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
