/**
 * Client-side export builders.
 *
 * Ports of the former /api/export/* routes, running entirely in the
 * browser. DOCX is generated with the `docx` package (browser-safe),
 * EPUB with a small self-contained ZIP (STORE method) writer.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx"
import * as s from "./services"
import type { Chapter, Project, Scene } from "./types"

export interface ProjectBook {
  project: Project
  chapters: Chapter[]
  scenes: Scene[]
}

export async function loadProjectBook(projectId: string): Promise<ProjectBook | null> {
  const project = await s.dbGetProject(projectId)
  if (!project) return null
  const [chapters, scenes] = await s.dbGetAllChaptersAndScenes()
  return {
    project,
    chapters: chapters
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => a.order - b.order),
    scenes: scenes.filter((sc) => {
      const chapter = chapters.find((c) => c.id === sc.chapterId)
      return chapter?.projectId === projectId
    }),
  }
}

export function sceneListForChapter(book: ProjectBook, chapterId: string): Scene[] {
  return (book.scenes ?? [])
    .filter((sc) => sc && sc.chapterId === chapterId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Defense-in-depth: export never crashes on corrupt/partial project data.
 * The app guards before calling (loadProjectBook returns null), but a
 * partially corrupted store must still export rather than crash — the
 * damaged rows are dropped, everything else is preserved.
 */
export function sanitizeBook(book: ProjectBook | null | undefined): ProjectBook {
  const emptyProject: Project = {
    id: "",
    name: "Untitled",
    description: "",
    genre: "",
    synopsis: "",
    status: "draft",
    coverImage: "",
    settings: "",
    createdAt: "",
    updatedAt: "",
  }
  if (!book || typeof book !== "object") {
    return { project: emptyProject, chapters: [], scenes: [] }
  }
  const rawProject = book.project && typeof book.project === "object" ? book.project : null
  const project: Project = {
    ...emptyProject,
    ...(rawProject ?? {}),
    name: String((rawProject as { name?: unknown } | null)?.name ?? "Untitled"),
  }
  const asArray = <T,>(v: T[] | T | null | undefined): T[] => (Array.isArray(v) ? v : [])
  return {
    project,
    chapters: asArray(book.chapters),
    scenes: asArray(book.scenes),
  }
}

export function buildMarkdown(book: ProjectBook): string {
  book = sanitizeBook(book)
  const lines: string[] = []
  lines.push(`# ${book.project.name}`)
  lines.push("")
  if (book.project.synopsis) {
    lines.push(book.project.synopsis)
    lines.push("")
  }
  for (const chapter of book.chapters) {
    lines.push(`# ${chapter.title}`)
    lines.push("")
    if (chapter.synopsis) {
      lines.push(chapter.synopsis)
      lines.push("")
    }
    for (const scene of sceneListForChapter(book, chapter.id)) {
      lines.push(`## ${scene.title}`)
      lines.push("")
      if (scene.content) {
        lines.push(
          scene.content
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
        )
        lines.push("")
      }
    }
  }
  return lines.join("\n")
}

export async function buildJson(book: ProjectBook): Promise<string> {
  book = sanitizeBook(book)
  const exportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    project: {
      id: book.project.id,
      name: book.project.name,
      description: book.project.description,
      genre: book.project.genre,
      synopsis: book.project.synopsis,
      status: book.project.status,
      settings: book.project.settings,
      createdAt: book.project.createdAt,
      updatedAt: book.project.updatedAt,
    },
    chapters: book.chapters.map((c) => ({ ...c, scenes: sceneListForChapter(book, c.id) })),
    characters: await s.dbGetAllForProject("characters", book.project.id),
    locations: await s.dbGetAllForProject("locations", book.project.id),
    storyObjects: await s.dbGetAllForProject("storyObjects", book.project.id),
    worldElements: await s.dbGetAllForProject("worldElements", book.project.id),
    timelineEvents: await s.dbGetAllForProject("timelineEvents", book.project.id),
    relationships: await s.dbGetAllForProject("relationships", book.project.id),
    notes: await s.dbGetAllForProject("notes", book.project.id),
  }
  return JSON.stringify(exportData, null, 2)
}

export function buildTxt(book: ProjectBook): string {
  book = sanitizeBook(book)
  const lines: string[] = []
  lines.push(book.project.name)
  lines.push("=".repeat(book.project.name.length))
  lines.push("")
  if (book.project.synopsis) {
    lines.push(book.project.synopsis)
    lines.push("")
  }
  for (const chapter of book.chapters) {
    lines.push(chapter.title)
    lines.push("-".repeat(chapter.title.length))
    lines.push("")
    if (chapter.synopsis) {
      lines.push(chapter.synopsis)
      lines.push("")
    }
    for (const scene of sceneListForChapter(book, chapter.id)) {
      lines.push(`  ${scene.title}`)
      lines.push(`  ${"~".repeat(scene.title.length)}`)
      lines.push("")
      if (scene.content) {
        const indented = s.stripHtml(scene.content)
          .split("\n")
          .map((line: string) => (line.trim() ? `  ${line}` : ""))
          .join("\n")
        lines.push(indented)
        lines.push("")
      }
    }
  }
  return lines.join("\n")
}

export function buildHtml(book: ProjectBook): string {
  book = sanitizeBook(book)
  const parts: string[] = []
  parts.push("<!DOCTYPE html>")
  parts.push(`<html lang="en">`)
  parts.push(`<head>`)
  parts.push(`<meta charset="UTF-8">`)
  parts.push(`<meta name="viewport" content="width=device-width, initial-scale=1.0">`)
  parts.push(`<title>${escapeHtml(book.project.name)}</title>`)
  parts.push(`<style>`)
  parts.push(`  body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.8; color: #333; }`)
  parts.push(`  h1 { font-size: 2em; margin-top: 2em; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }`)
  parts.push(`  h2 { font-size: 1.5em; margin-top: 1.5em; color: #555; }`)
  parts.push(`  .synopsis { font-style: italic; color: #666; margin-bottom: 2em; }`)
  parts.push(`  .chapter-synopsis { font-style: italic; color: #888; font-size: 0.9em; }`)
  parts.push(`  .scene-content { margin-bottom: 1em; }`)
  parts.push(`</style>`)
  parts.push(`</head>`)
  parts.push(`<body>`)
  parts.push(`<h1>${escapeHtml(book.project.name)}</h1>`)
  if (book.project.synopsis) {
    parts.push(`<p class="synopsis">${escapeHtml(book.project.synopsis)}</p>`)
  }
  for (const chapter of book.chapters) {
    parts.push(`<h1>${escapeHtml(chapter.title)}</h1>`)
    if (chapter.synopsis) {
      parts.push(`<p class="chapter-synopsis">${escapeHtml(chapter.synopsis)}</p>`)
    }
    for (const scene of sceneListForChapter(book, chapter.id)) {
      parts.push(`<h2>${escapeHtml(scene.title)}</h2>`)
      if (scene.content) {
        if (/<[^>]+>/.test(scene.content)) {
          parts.push(`<div class="scene-content">${scene.content}</div>`)
        } else {
          for (const para of scene.content.split("\n").filter((l) => l.trim())) {
            parts.push(`<div class="scene-content"><p>${escapeHtml(para)}</p></div>`)
          }
        }
      }
    }
  }
  parts.push(`</body>`)
  parts.push(`</html>`)
  return parts.join("\n")
}

export async function buildDocx(book: ProjectBook): Promise<Blob> {
  book = sanitizeBook(book)
  const children: Paragraph[] = []
  children.push(
    new Paragraph({
      text: book.project.name,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    })
  )
  if (book.project.synopsis) {
    children.push(new Paragraph({ text: "" }))
    children.push(
      new Paragraph({
        children: [new TextRun({ text: book.project.synopsis, italics: true, size: 22 })],
        alignment: AlignmentType.CENTER,
      })
    )
  }
  for (const chapter of book.chapters) {
    children.push(new Paragraph({ text: "" }))
    children.push(new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1 }))
    if (chapter.synopsis) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: chapter.synopsis, italics: true, size: 22, color: "666666" })],
        })
      )
    }
    for (const scene of sceneListForChapter(book, chapter.id)) {
      children.push(new Paragraph({ text: "" }))
      children.push(new Paragraph({ text: scene.title, heading: HeadingLevel.HEADING_2 }))
      if (scene.content) {
        for (const line of s.stripHtml(scene.content).split("\n").filter((l) => l.trim())) {
          children.push(new Paragraph({ children: [new TextRun({ text: line, size: 24 })] }))
        }
      }
    }
  }
  const doc = new Document({
    sections: [{ properties: {}, children }],
  })
  return Packer.toBlob(doc)
}

// ─────────────────────────────────────────────────────────────
// EPUB (self-contained, EPUB 2.0.1 + ZIP STORE)
// ─────────────────────────────────────────────────────────────

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    let c = (crc ^ data[i]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = []
  const central: { name: Uint8Array; data: Uint8Array; crc: number; offset: number }[] = []
  let offset = 0

  for (const f of files) {
    const name = new TextEncoder().encode(f.name)
    const crc = crc32(f.data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0, true)
    local.setUint16(8, 0, true)
    local.setUint16(10, 0, true)
    local.setUint16(12, 0x21, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, f.data.length, true)
    local.setUint32(22, f.data.length, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    chunks.push(new Uint8Array(local.buffer), name, f.data)
    central.push({ name, data: f.data, crc, offset })
    offset += 30 + name.length + f.data.length
  }

  const centralStart = offset
  const centralChunks: Uint8Array[] = []
  for (const c of central) {
    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0, true)
    cd.setUint16(10, 0, true)
    cd.setUint16(12, 0, true)
    cd.setUint16(14, 0x21, true)
    cd.setUint32(16, c.crc, true)
    cd.setUint32(20, c.data.length, true)
    cd.setUint32(24, c.data.length, true)
    cd.setUint16(28, c.name.length, true)
    cd.setUint16(30, 0, true)
    cd.setUint16(32, 0, true)
    cd.setUint16(34, 0, true)
    cd.setUint16(36, 0, true)
    cd.setUint32(38, 0, true)
    cd.setUint32(42, c.offset, true)
    centralChunks.push(new Uint8Array(cd.buffer), c.name)
  }
  const centralSize = centralChunks.reduce((n, c) => n + c.length, 0)

  const eocd = new DataView(new ArrayBuffer(22))
  eocd.setUint32(0, 0x06054b50, true)
  eocd.setUint16(4, 0, true)
  eocd.setUint16(6, 0, true)
  eocd.setUint16(8, central.length, true)
  eocd.setUint16(10, central.length, true)
  eocd.setUint32(12, centralSize, true)
  eocd.setUint32(16, centralStart, true)
  eocd.setUint16(20, 0, true)

  const all = new Uint8Array(offset + centralSize + 22)
  let pos = 0
  for (const c of chunks) {
    all.set(c, pos)
    pos += c.length
  }
  for (const c of centralChunks) {
    all.set(c, pos)
    pos += c.length
  }
  all.set(new Uint8Array(eocd.buffer), pos)
  return all
}

export function buildEpub(book: ProjectBook): Blob {
  book = sanitizeBook(book)
  const chapters = book.chapters.map((c) => ({ ...c, scenes: sceneListForChapter(book, c.id) }))
  const epubChapters: { title: string; content: string }[] = []

  for (const chapter of chapters) {
    let chapterContent = ""
    for (const scene of chapter.scenes) {
      chapterContent += `<h2>${escapeHtml(scene.title)}</h2>\n`
      if (scene.content) {
        if (/<[^>]+>/.test(scene.content)) {
          chapterContent += scene.content
        } else {
          for (const para of s.stripHtml(scene.content).split("\n").filter((l) => l.trim())) {
            chapterContent += `<p>${escapeHtml(para)}</p>\n`
          }
        }
      }
      chapterContent += "\n"
    }
    epubChapters.push({
      title: chapter.title,
      content: chapterContent || "<p><em>Empty chapter</em></p>",
    })
  }

  if (epubChapters.length === 0) {
    epubChapters.push({ title: "Untitled", content: "<p>This project has no content yet.</p>" })
  }

  const title = book.project.name
  const author = "Open Writer"
  const description = book.project.synopsis || book.project.description || ""

  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`

  const manifestItems = [
    `    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `    <item id="css" href="style.css" media-type="text/css"/>`,
    ...epubChapters.map((_, i) => `    <item id="chapter-${i + 1}" href="chapter-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`),
  ].join("\n")
  const spineItems = epubChapters.map((_, i) => `    <itemref idref="chapter-${i + 1}"/>`).join("\n")

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:creator opf:role="aut">${escapeHtml(author)}</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">open-writer-${book.project.id}</dc:identifier>
    ${description ? `<dc:description>${escapeHtml(description)}</dc:description>` : ""}
  </metadata>
  <manifest>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="open-writer-${book.project.id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeHtml(title)}</text></docTitle>
  <navMap>
${epubChapters
  .map(
    (c, i) => `    <navPoint id="nav-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeHtml(c.title)}</text></navLabel>
      <content src="chapter-${i + 1}.xhtml"/>
    </navPoint>`
  )
  .join("\n")}
  </navMap>
</ncx>`

  const css = `body { font-family: Georgia, serif; line-height: 1.6; margin: 5%; }
h1 { font-size: 1.6em; }
h2 { font-size: 1.2em; color: #444; }
p { margin: 0.6em 0; }`

  const enc = new TextEncoder()
  const files: { name: string; data: Uint8Array }[] = [
    { name: "mimetype", data: enc.encode("application/epub+zip") },
    { name: "META-INF/container.xml", data: enc.encode(containerXml) },
    { name: "OEBPS/content.opf", data: enc.encode(contentOpf) },
    { name: "OEBPS/toc.ncx", data: enc.encode(ncx) },
    { name: "OEBPS/style.css", data: enc.encode(css) },
    ...epubChapters.map(
      (c, i) =>
        ({
          name: `OEBPS/chapter-${i + 1}.xhtml`,
          data: enc.encode(
            `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head><title>${escapeHtml(c.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>\n<body>\n<h1>${escapeHtml(c.title)}</h1>\n${c.content}\n</body>\n</html>`
          ),
        }) as { name: string; data: Uint8Array }
    ),
  ]

  const zip = zipStore(files)
  return new Blob([zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer], { type: "application/epub+zip" })
}
