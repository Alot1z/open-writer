// Generates PWA PNG icons for the Ink & Paper brand: an indigo tile with a
// white pen glyph (matches the tray icon and the in-app mark).
import sharp from "sharp"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, "../public/icons")
fs.mkdirSync(outDir, { recursive: true })

// Brand tile: indigo-600 (#4f46e5). Dark theme tile for maskable uses a
// slightly deeper indigo so the glyph stays readable.
const TILE = { r: 79, g: 70, b: 229, alpha: 1 } // #4f46e5 indigo-600

// White pen glyph drawn in SVG (diagonal nib, same shape as the tray icon).
function penSvg(px) {
  const u = px / 64
  return Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${px}' height='${px}' viewBox='0 0 64 64'>
      <g transform='rotate(-18 32 32)'>
        <path d='M12 44 L52 10 C55 7.5 58 9.5 59 12 L56.5 15.5 L51 13.5 L20 40.5 L21 34 L49 10.5 C53 7.5 58 11 56 15 L27 44 Z' fill='white'/>
        <rect x='25' y='43' width='22' height='6' rx='2.5' fill='white' transform='rotate(-18 36 46)'/>
        <path d='M13 47 L20 44 L17 51 Z' fill='white'/>
      </g>
    </svg>`
  )
}

const SIZES = [192, 512]

async function main() {
  for (const size of SIZES) {
    // Regular icon: indigo rounded tile, pen glyph centered.
    const glyph = sharp(penSvg(Math.round(size * 0.62)))
    const icon = await sharp({
      create: { width: size, height: size, channels: 4, background: TILE },
    })
      .composite([{ input: await glyph.png().toBuffer(), gravity: "center" }])
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`))
    console.log(`icon-${size}.png: ${icon.width}x${icon.height}, ${icon.size} bytes`)

    // Maskable: full-bleed indigo, glyph at ~50% (inside the 80% safe zone).
    const glyphMask = sharp(penSvg(Math.round(size * 0.46)))
    const maskable = await sharp({
      create: { width: size, height: size, channels: 4, background: TILE },
    })
      .composite([{ input: await glyphMask.png().toBuffer(), gravity: "center" }])
      .png()
      .toFile(path.join(outDir, `maskable-${size}.png`))
    console.log(`maskable-${size}.png: ${maskable.width}x${maskable.height}, ${maskable.size} bytes`)
  }

  // Apple touch icon: 180px regular tile.
  const glyph180 = sharp(penSvg(112))
  await sharp({
    create: { width: 180, height: 180, channels: 4, background: TILE },
  })
    .composite([{ input: await glyph180.png().toBuffer(), gravity: "center" }])
    .png()
    .toFile(path.join(outDir, "apple-touch-icon.png"))
  console.log("apple-touch-icon.png: 180x180")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
