import fs from "node:fs"

const CR = "\r\n"

function patch(path, pairs) {
  let src = fs.readFileSync(path, "utf8")
  const crlf = src.includes(CR)
  const norm = (s) => (crlf ? s.split("\n").join(CR) : s)
  let miss = 0
  for (const [oldS, newS] of pairs) {
    const oldN = norm(oldS)
    if (!src.includes(oldN)) {
      console.log(`MISS ${path}: ${JSON.stringify(oldN.slice(0, 80))}`)
      miss++
      continue
    }
    src = src.split(oldN).join(norm(newS))
  }
  fs.writeFileSync(path, src)
  console.log(`patched ${path}${miss ? ` (${miss} misses)` : ""}`)
}

function ensureImport(path, marker, importLine) {
  let src = fs.readFileSync(path, "utf8")
  const crlf = src.includes(CR)
  const line = crlf ? importLine.split("\n").join(CR) : importLine
  if (src.includes(line)) return
  const sep = crlf ? CR + CR : "\n\n"
  src = src.replace(marker, marker + sep + line)
  fs.writeFileSync(path, src)
  console.log(`import added: ${path}`)
}

// 1) RichTextEditor: apply editor settings live
patch("src/components/writer/rich-text-editor.tsx", [
  [
    "import { cn } from '@/lib/utils'",
    "import { cn } from '@/lib/utils'\nimport { FONT_MAP, loadEditorSettings, subscribeSettings } from '@/lib/settings'",
  ],
  [
    "  const typewriterRafRef = useRef<number | null>(null)",
    "  const typewriterRafRef = useRef<number | null>(null)\n  const [editorSettings, setEditorSettings] = useState(loadEditorSettings)\n\n  // Re-apply settings when they change (Settings dialog save)\n  useEffect(() => subscribeSettings(() => setEditorSettings(loadEditorSettings())), [])",
  ],
  [
    '        <div className="max-w-3xl mx-auto px-8 py-6">\n          <EditorContent\n            editor={editor}\n            className="tiptap-wrapper"\n          />\n        </div>',
    '        <div\n          className="mx-auto px-8 py-6"\n          style={{\n            maxWidth: editorSettings.maxWidth,\n            fontFamily: FONT_MAP[editorSettings.fontFamily],\n            fontSize: editorSettings.fontSize,\n            lineHeight: editorSettings.lineHeight,\n            ["--ow-para-spacing" as string]: editorSettings.paragraphSpacing + "rem",\n          } as React.CSSProperties}\n        >\n          <EditorContent\n            editor={editor}\n            className="tiptap-wrapper"\n          />\n        </div>',
  ],
  [
    "import React, { useCallback, useEffect, useRef } from 'react'",
    "import React, { useCallback, useEffect, useRef, useState } from 'react'",
  ],
])

// 2) EditorArea: autosave interval from Writing settings
patch("src/components/writer/editor-area.tsx", [
  [
    "import { PenLine, FileText } from 'lucide-react'",
    "import { PenLine, FileText } from 'lucide-react'\nimport { loadWritingSettings } from '@/lib/settings'",
  ],
  [
    "      // Debounced autosave (1.5 seconds)\n      autosaveTimer.current = setTimeout(async () => {",
    "      // Debounced autosave (interval from Writing settings)\n      const intervalMs = Math.max(0.5, loadWritingSettings().autosaveInterval) * 1000\n      autosaveTimer.current = setTimeout(async () => {",
  ],
  [
    "        }\n      }, 1500)",
    "        }\n      }, intervalMs)",
  ],
])

// 3) chapter-tree: default scene status from Writing settings
patch("src/components/writer/chapter-tree.tsx", [
  [
    "        body: JSON.stringify({ chapterId: targetChapterId, title: newItemTitle.trim() }),",
    "        body: JSON.stringify({\n          chapterId: targetChapterId,\n          title: newItemTitle.trim(),\n          status: loadWritingSettings().defaultSceneStatus,\n        }),",
  ],
])
ensureImport(
  "src/components/writer/chapter-tree.tsx",
  "'use client'",
  "import { loadWritingSettings } from '@/lib/settings'"
)

// 4) goals-panel: prefill from Goal settings
patch("src/components/writer/goals-panel.tsx", [
  [
    "  const [newTarget, setNewTarget] = useState(1000)\n  const [newDeadline, setNewDeadline] = useState('')",
    "  const [newTarget, setNewTarget] = useState(() => loadGoalSettings().dailyWordGoal)\n  const [newDeadline, setNewDeadline] = useState(() => loadGoalSettings().projectDeadline)",
  ],
])
ensureImport(
  "src/components/writer/goals-panel.tsx",
  "'use client'",
  "import { loadGoalSettings } from '@/lib/settings'"
)

// 5) settings-dialog: notify runtime on save
patch("src/components/writer/settings-dialog.tsx", [
  [
    '    saveSettings("privacy", privacy as unknown as Record<string, unknown>)\n    setSettingsOpen(false)\n  }',
    '    saveSettings("privacy", privacy as unknown as Record<string, unknown>)\n    setSettingsOpen(false)\n    notifySettingsChanged()\n  }',
  ],
])
ensureImport(
  "src/components/writer/settings-dialog.tsx",
  'import { Separator } from "@/components/ui/separator"',
  'import { notifySettingsChanged } from "@/lib/settings"'
)

// 6) globals.css: paragraph spacing via CSS variable
patch("src/app/globals.css", [
  [
    ".tiptap p {\n  margin-bottom: 0.75em;\n}",
    ".tiptap p {\n  margin-bottom: var(--ow-para-spacing, 0.75em);\n}",
  ],
])

console.log("all runtime wiring patches done")
