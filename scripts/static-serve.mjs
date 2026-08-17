// Minimal static server for the exported site (out/). No deps.
import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { join, normalize, extname } from "node:path"

const root = process.argv[2] || "out"
const port = Number(process.argv[3] || 4173)
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
}

createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://x").pathname)
    // The static export compiles the basePath into URLs (/open-writer/...) but
    // the artifact layout is at the root (out/index.html, out/_next/...).
    if (pathname === "/open-writer" || pathname.startsWith("/open-writer/")) {
      pathname = pathname.slice("/open-writer".length) || "/"
    }
    if (pathname.endsWith("/")) pathname += "index.html"
    let file = normalize(join(root, pathname))
    if (!file.startsWith(normalize(root))) {
      res.writeHead(403).end("forbidden")
      return
    }
    let data = null
    try {
      data = await readFile(file)
    } catch {
      // SPA fallback for deep links
      file = join(root, "index.html")
      data = await readFile(file)
    }
    const type = MIME[extname(file).toLowerCase()] || "application/octet-stream"
    res.writeHead(200, { "content-type": type, "cache-control": "no-cache" })
    res.end(data)
  } catch (e) {
    res.writeHead(500).end(String(e))
  }
}).listen(port, "127.0.0.1", () => console.log(`static server on http://127.0.0.1:${port}`))
