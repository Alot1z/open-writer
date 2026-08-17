// Generates PWA PNG icons from public/logo.svg using sharp.
import sharp from "sharp"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(__dirname, "../public/logo.svg")
const outDir = path.resolve(__dirname, "../public/icons")
fs.mkdirSync(outDir, { recursive: true })

// The logo is a dark rounded square with a white pen glyph. For PWA icons we
// want a solid, high-contrast tile: amber background (brand accent) with the
// white pen centered, plus a maskable variant with safe-zone padding.
const SIZES = [192, 512]

async function main() {
  for (const size of SIZES) {
    // Regular icon: amber rounded tile, pen glyph centered at ~72% scale.
    const glyph = await sharp(src).resize(Math.round(size * 0.72), Math.round(size * 0.72)).toBuffer()
    const icon = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 217, g: 119, b: 6, alpha: 1 }, // amber-600
      },
    })
      .composite([{ input: glyph, gravity: "center" }])
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`))
    console.log(`icon-${size}.png: ${icon.width}x${icon.height}, ${icon.size} bytes`)

    // Maskable: full-bleed amber, glyph at ~50% (inside the 80% safe zone).
    const glyphMask = await sharp(src).resize(Math.round(size * 0.5), Math.round(size * 0.5)).toBuffer()
    const maskable = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 217, g: 119, b: 6, alpha: 1 },
      },
    })
      .composite([{ input: glyphMask, gravity: "center" }])
      .png()
      .toFile(path.join(outDir, `maskable-${size}.png`))
    console.log(`maskable-${size}.png: ${maskable.width}x${maskable.height}, ${maskable.size} bytes`)
  }

  // Apple touch icon: 180px regular tile (no transparency quirks on iOS).
  const glyph180 = await sharp(src).resize(130, 130).toBuffer()
  await sharp({
    create: { width: 180, height: 180, channels: 4, background: { r: 217, g: 119, b: 6, alpha: 1 } },
  })
    .composite([{ input: glyph180, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, "apple-touch-icon.png"))
  console.log("apple-touch-icon.png: 180x180")
}

main().catch((e) => { console.error(e); process.exit(1) })
