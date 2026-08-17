// Generates a Windows .ico for the desktop app from the logo (via sharp PNGs).
import sharp from "sharp"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(__dirname, "../public/logo.svg")
const outDir = path.resolve(__dirname, "../electron")
const sizes = [16, 24, 32, 48, 64, 128, 256]

// ICO header: reserved(2) + type(2) + count(2), then a 16-byte dir entry per image.
function buildIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(pngs.length, 4)
  let offset = 6 + pngs.length * 16
  const dir = []
  const blobs = []
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
    entry.writeUInt8(0, 2) // palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // planes
    entry.writeUInt16LE(32, 6) // bpp
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    dir.push(entry)
    blobs.push(data)
    offset += data.length
  }
  return Buffer.concat([header, ...dir, ...blobs])
}

async function main() {
  const pngs = []
  for (const size of sizes) {
    const glyph = await sharp(src).resize(Math.round(size * 0.72), Math.round(size * 0.72)).toBuffer()
    const png = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 217, g: 119, b: 6, alpha: 1 } },
    })
      .composite([{ input: glyph, gravity: "center" }])
      .png()
      .toBuffer()
    pngs.push({ size, data: png })
  }
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, "icon.ico"), buildIco(pngs))
  console.log("electron/icon.ico written (16→256 px)")
}

main().catch((e) => { console.error(e); process.exit(1) })
