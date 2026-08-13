"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useWriterStore } from "@/store/writer-store"
import { useToast } from "@/hooks/use-toast"
import { Download, Loader2, FileText, FileJson, BookOpen, Globe, File, FileType } from "lucide-react"

type ExportFormat = "markdown" | "json" | "docx" | "epub" | "html" | "txt"

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: React.ElementType; description: string }[] = [
  { value: "markdown", label: "Markdown", icon: FileText, description: "Portable markup format" },
  { value: "json", label: "JSON", icon: FileJson, description: "Complete project archive" },
  { value: "docx", label: "Word (DOCX)", icon: FileType, description: "Microsoft Word document" },
  { value: "epub", label: "EPUB", icon: BookOpen, description: "E-book format" },
  { value: "html", label: "HTML", icon: Globe, description: "Web page format" },
  { value: "txt", label: "Plain Text", icon: File, description: "Simple text format" },
]

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ExportPanel() {
  const { currentProjectId, currentProjectName } = useWriterStore()
  const { toast } = useToast()
  const [format, setFormat] = useState<ExportFormat>("markdown")
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!currentProjectId) {
      toast({ title: "No project selected", description: "Please select a project first.", variant: "destructive" })
      return
    }

    setExporting(true)

    try {
      const projectSlug = currentProjectName.replace(/[^a-zA-Z0-9]/g, "_") || "project"
      const getFormats: ExportFormat[] = ["markdown", "json", "html", "txt"]
      const postFormats: ExportFormat[] = ["docx", "epub"]

      if (getFormats.includes(format)) {
        // GET request
        const response = await fetch(`/api/export/${format}?projectId=${currentProjectId}`)
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Export failed" }))
          throw new Error(err.error || "Export failed")
        }

        const blob = await response.blob()
        const extensions: Record<ExportFormat, string> = {
          markdown: "md",
          json: "json",
          docx: "docx",
          epub: "epub",
          html: "html",
          txt: "txt",
        }
        downloadBlob(blob, `${projectSlug}.${extensions[format]}`)
      } else if (postFormats.includes(format)) {
        // POST request
        const response = await fetch(`/api/export/${format}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: currentProjectId }),
        })
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Export failed" }))
          throw new Error(err.error || "Export failed")
        }

        const blob = await response.blob()
        const extensions: Record<ExportFormat, string> = { docx: "docx", epub: "epub", markdown: "md", json: "json", html: "html", txt: "txt" }
        downloadBlob(blob, `${projectSlug}.${extensions[format]}`)
      }

      toast({
        title: "Export successful",
        description: `Exported as ${format.toUpperCase()} successfully.`,
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const selectedFormat = FORMAT_OPTIONS.find((f) => f.value === format)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium">Export Format</p>
        <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                <div className="flex items-center gap-2">
                  <opt.icon className="size-3.5" />
                  <span>{opt.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedFormat && (
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 mb-1">
            <selectedFormat.icon className="size-3.5" />
            <span className="font-medium text-foreground">{selectedFormat.label}</span>
          </div>
          <p>{selectedFormat.description}</p>
        </div>
      )}

      <Button
        onClick={handleExport}
        disabled={exporting || !currentProjectId}
        className="w-full text-xs gap-2"
        size="sm"
      >
        {exporting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        {exporting ? "Exporting..." : "Export Project"}
      </Button>

      {!currentProjectId && (
        <p className="text-[10px] text-muted-foreground text-center">
          Select a project to enable export
        </p>
      )}
    </div>
  )
}
