'use client'

import { useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  FileJson,
  FileDown,
  BookOpen,
  Globe,
  FileType,
  Download,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type ExportFormat = 'markdown' | 'json' | 'docx' | 'epub' | 'html' | 'txt'
type ExportStatus = 'idle' | 'exporting' | 'success' | 'error'

interface FormatOption {
  value: ExportFormat
  label: string
  extension: string
  description: string
  icon: React.ElementType
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'markdown', label: 'Markdown', extension: '.md', description: 'Clean, portable plain text format', icon: FileText },
  { value: 'json', label: 'JSON', extension: '.json', description: 'Full project data structure', icon: FileJson },
  { value: 'docx', label: 'DOCX', extension: '.docx', description: 'Microsoft Word document', icon: FileDown },
  { value: 'epub', label: 'EPUB', extension: '.epub', description: 'E-book publication format', icon: BookOpen },
  { value: 'html', label: 'HTML', extension: '.html', description: 'Web-ready publication format', icon: Globe },
  { value: 'txt', label: 'TXT', extension: '.txt', description: 'Plain text export', icon: FileType },
]

// Formats that use GET vs POST (matches existing export-panel.tsx pattern)
const GET_FORMATS: ExportFormat[] = ['markdown', 'json', 'html', 'txt']
const POST_FORMATS: ExportFormat[] = ['docx', 'epub']

const EXTENSION_MAP: Record<ExportFormat, string> = {
  markdown: 'md',
  json: 'json',
  docx: 'docx',
  epub: 'epub',
  html: 'html',
  txt: 'txt',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExportSidePanel() {
  const { currentProjectId, currentProjectName } = useWriterStore()
  const { toast } = useToast()

  // Per-format export status
  const [statusMap, setStatusMap] = useState<Record<ExportFormat, ExportStatus>>({
    markdown: 'idle',
    json: 'idle',
    docx: 'idle',
    epub: 'idle',
    html: 'idle',
    txt: 'idle',
  })

  // Track the most-recently-exported format for the success animation
  const [lastExported, setLastExported] = useState<ExportFormat | null>(null)

  // Reset success badge after a short delay
  const clearSuccess = (format: ExportFormat) => {
    setTimeout(() => {
      setStatusMap((prev) => ({ ...prev, [format]: 'idle' }))
      setLastExported((prev) => (prev === format ? null : prev))
    }, 2500)
  }

  const handleExport = async (format: ExportFormat) => {
    if (!currentProjectId) {
      toast({
        title: 'No project selected',
        description: 'Please select a project first.',
        variant: 'destructive',
      })
      return
    }

    setStatusMap((prev) => ({ ...prev, [format]: 'exporting' }))

    try {
      const projectSlug = currentProjectName.replace(/[^a-zA-Z0-9]/g, '_') || 'project'
      let response: Response

      if (GET_FORMATS.includes(format)) {
        response = await fetch(`/api/export/${format}?projectId=${currentProjectId}`)
      } else {
        response = await fetch(`/api/export/${format}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: currentProjectId }),
        })
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(err.error || 'Export failed')
      }

      const blob = await response.blob()
      downloadBlob(blob, `${projectSlug}.${EXTENSION_MAP[format]}`)

      setStatusMap((prev) => ({ ...prev, [format]: 'success' }))
      setLastExported(format)
      clearSuccess(format)

      toast({
        title: 'Export successful',
        description: `Exported as ${FORMAT_OPTIONS.find((f) => f.value === format)?.label ?? format} successfully.`,
      })
    } catch (error) {
      setStatusMap((prev) => ({ ...prev, [format]: 'error' }))
      setTimeout(() => {
        setStatusMap((prev) => ({ ...prev, [format]: 'idle' }))
      }, 3000)

      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      })
    }
  }

  const isAnyExporting = Object.values(statusMap).some((s) => s === 'exporting')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
          Export your project
        </p>
        <p className="text-[10px] text-muted-foreground">
          Choose a format to download your work
        </p>
      </div>

      <Separator className="bg-stone-200 dark:bg-stone-700" />

      {/* Format grid — 2 columns */}
      <div className="grid grid-cols-2 gap-2.5">
        {FORMAT_OPTIONS.map((fmt) => {
          const status = statusMap[fmt.value]
          const Icon = fmt.icon
          const isActive = status === 'exporting' || status === 'success'

          return (
            <Card
              key={fmt.value}
              className={`group cursor-pointer transition-all duration-200 py-0 gap-0 overflow-hidden
                ${isActive
                  ? 'border-amber-400 dark:border-amber-500 ring-1 ring-amber-400/30'
                  : 'border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500'
                }
                ${status === 'error' ? 'border-destructive ring-1 ring-destructive/30' : ''}
              `}
              onClick={() => {
                if (status !== 'exporting') handleExport(fmt.value)
              }}
            >
              <CardHeader className="p-3 pb-1 space-y-0">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex items-center justify-center size-8 rounded-md
                      ${isActive
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 group-hover:bg-stone-200 dark:group-hover:bg-stone-700'
                      }
                      transition-colors
                    `}
                  >
                    {status === 'exporting' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : status === 'success' && lastExported === fmt.value ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] px-1.5 py-0 font-mono shrink-0
                      ${isActive
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                      }
                    `}
                  >
                    {fmt.extension}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-3 pt-1">
                <p className="text-[11px] font-semibold leading-tight text-stone-800 dark:text-stone-200">
                  {fmt.label}
                </p>
                <p className="text-[9px] leading-snug text-muted-foreground mt-0.5 line-clamp-2">
                  {fmt.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Export all button */}
      <Separator className="bg-stone-200 dark:bg-stone-700" />

      <Button
        onClick={() => handleExport('markdown')}
        disabled={isAnyExporting || !currentProjectId}
        className="w-full text-xs gap-2 bg-stone-700 hover:bg-stone-800 dark:bg-stone-600 dark:hover:bg-stone-500"
        size="sm"
      >
        {statusMap.markdown === 'exporting' ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        {statusMap.markdown === 'exporting' ? 'Exporting...' : 'Quick Export as Markdown'}
      </Button>

      {!currentProjectId && (
        <p className="text-[10px] text-muted-foreground text-center">
          Select a project to enable export
        </p>
      )}
    </div>
  )
}
