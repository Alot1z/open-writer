"use strict"

/**
 * Open Writer — Windows desktop shell.
 *
 * Loads the same static build that ships to GitHub Pages, served from a
 * loopback HTTP server rooted at /open-writer/. This keeps asset paths,
 * basePath handling and behavior identical to the web version while
 * working fully offline. All data stays in the browser profile's
 * IndexedDB (per-user AppData), exactly like the web version.
 */

const { app, BrowserWindow, shell, Menu } = require("electron")
const http = require("node:http")
const fs = require("node:fs")
const path = require("node:path")

const BASE_PATH = "/open-writer"
const PORT = 0 // ephemeral — the OS assigns a free port

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
}

function startServer() {
  const root = path.join(__dirname, "..", "out")
  if (!fs.existsSync(path.join(root, "index.html"))) {
    console.error("out/index.html not found. Run `bun run build` first.")
    app.exit(1)
    return null
  }

  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname)
      if (!urlPath.startsWith(BASE_PATH)) {
        res.writeHead(404).end("Not found")
        return
      }
      let rel = urlPath.slice(BASE_PATH.length)
      if (rel === "" || rel.endsWith("/")) rel += "index.html"
      // Prevent path traversal
      const filePath = path.normalize(path.join(root, rel))
      if (!filePath.startsWith(root)) {
        res.writeHead(403).end("Forbidden")
        return
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          // SPA fallback for deep links (mirrors GitHub Pages behavior)
          if (rel !== "index.html") {
            fs.readFile(path.join(root, "index.html"), (err2, html) => {
              if (err2) {
                res.writeHead(404).end("Not found")
                return
              }
              res.writeHead(200, { "Content-Type": MIME[".html"] })
              res.end(html)
            })
            return
          }
          res.writeHead(404).end("Not found")
          return
        }
        const ext = path.extname(filePath).toLowerCase()
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" })
        res.end(data)
      })
    } catch (e) {
      res.writeHead(500).end("Internal error")
    }
  })

  return new Promise((resolve) => {
    server.listen(PORT, "127.0.0.1", () => {
      resolve({ server, port: server.address().port })
    })
  })
}

let mainWindow = null

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#0c0a09",
    title: "Open Writer",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Open external links in the system browser, keep app links in-app
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith("http://127.0.0.1") || target.startsWith("http://localhost")) {
      return { action: "allow" }
    }
    shell.openExternal(target)
    return { action: "deny" }
  })

  mainWindow.webContents.on("will-navigate", (e, target) => {
    const allowed = target.startsWith(`http://127.0.0.1:${url.port}`) || target.startsWith("http://localhost")
    if (!allowed) {
      e.preventDefault()
      shell.openExternal(target)
    }
  })

  Menu.setApplicationMenu(null)
  mainWindow.loadURL(`http://127.0.0.1:${url.port}${BASE_PATH}/`)
  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    const url = await startServer()
    if (!url) return
    createWindow(url)
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(url)
    })
  })

  app.on("window-all-closed", () => {
    app.quit()
  })
}
