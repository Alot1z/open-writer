/**
 * Minimal static server for verifying the exported site exactly as
 * GitHub Pages will serve it: everything under /open-writer/.
 *
 *   node scripts/serve-out.mjs [port]
 *
 * Serves ./out at http://localhost:PORT/open-writer/...
 */
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, "../out")
const BASE = "/open-writer"
const PORT = Number(process.argv[2] || 8791)

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
}

const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || "/").split("?")[0])

  if (url === "/") {
    res.writeHead(302, { Location: `${BASE}/` })
    res.end()
    return
  }
  if (!url.startsWith(BASE + "/")) {
    res.writeHead(404, { "Content-Type": "text/plain" })
    res.end("Not found")
    return
  }

  let rel = url.slice(BASE.length)
  if (rel === "" || rel === "/") rel = "/index.html"
  let filePath = path.normalize(path.join(OUT_DIR, rel))
  if (!filePath.startsWith(OUT_DIR)) {
    res.writeHead(403)
    res.end("Forbidden")
    return
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback for deep links
      fs.readFile(path.join(OUT_DIR, "404.html"), (err2, data) => {
        if (err2) {
          res.writeHead(404)
          res.end("Not found")
          return
        }
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" })
        res.end(data)
      })
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" })
    fs.createReadStream(filePath).pipe(res)
  })
})

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Serving ${OUT_DIR} at http://127.0.0.1:${PORT}${BASE}/`)
})
