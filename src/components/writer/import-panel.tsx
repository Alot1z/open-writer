"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useWriterStore } from "@/store/writer-store"
import { useDataStore } from "@/store/data-store"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Upload, Loader2, FileText, FileJson, File, FileType, X, CheckCircle } from "lucide-react"

type ImportFormat = "markdown" | "json" | "text"

interface FileInfo {
  name: string
  size: number
  type: string
  format: ImportFormat
  content: string
  preview: string
}

const ACCEPTED_EXTENSIONS = [".md", ".json", ".txt", ".docx"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function detectFormat(filename: string): ImportFormat | null {
  const ext = filename.toLowerCase().split(".").pop()
  switch (ext) {
    case "md":
      return "markdown"
    case "json":
      return "json"
    case "txt":
      return "text"
    default:
      return null
  }
}

function getFormatIcon(format: ImportFormat): React.ElementType {
  switch (format) {
    case "markdown":
      return FileText
    case "json":
      return FileJson
    case "text":
      return File
  }
}

export function ImportPanel() {
  const { currentProjectId } = useWriterStore()
  const store = useDataStore()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const processFile = useCallback((file: File) => {
    const format = detectFormat(file.name)

    if (!format) {
      toast({
        title: "Unsupported format",
        description: "Supported formats: .md, .json, .txt",
        variant: "destructive",
      })
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}`,
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const preview = content.slice(0, 500)
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type,
        format,
        content,
        preview,
      })
    }
    reader.readAsText(file)
  }, [toast])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleImport = async () => {
    if (!currentProjectId || !fileInfo) return

    setImporting(true)
    setShowConfirm(false)

    try {
      if (fileInfo.format === "markdown") {
        // Parse markdown: split by ## headers into chapters
        const lines = fileInfo.content.split('\n')
        let currentChapterId: string | null = null
        let currentSceneId: string | null = null
        let sceneContent: string[] = []

        for (const line of lines) {
          if (line.startsWith('## ')) {
            // Save previous scene
            if (currentSceneId && sceneContent.length > 0) {
              store.updateScene(currentSceneId, { content: sceneContent.join('\n') })
              sceneContent = []
            }
            // Create new chapter
            const ch = store.addChapter({ projectId: currentProjectId, title: line.replace('## ', '').trim() })
            currentChapterId = ch.id
            const sc = store.addScene({ projectId: currentProjectId, chapterId: ch.id, title: 'Content', content: '', wordCount: 0 })
            currentSceneId = sc.id
          } else if (line.startsWith('### ') && currentChapterId) {
            // Save previous scene
            if (currentSceneId && sceneContent.length > 0) {
              store.updateScene(currentSceneId, { content: sceneContent.join('\n') })
              sceneContent = []
            }
            const sc = store.addScene({ projectId: currentProjectId, chapterId: currentChapterId, title: line.replace('### ', '').trim(), content: '', wordCount: 0 })
            currentSceneId = sc.id
          } else if (currentSceneId) {
            sceneContent.push(line)
          }
        }
        // Save last scene
        if (currentSceneId && sceneContent.length > 0) {
          store.updateScene(currentSceneId, { content: sceneContent.join('\n') })
        }
      } else if (fileInfo.format === "json") {
        const data = JSON.parse(fileInfo.content)
        // Import chapters if present
        if (data.chapters) {
          for (const ch of data.chapters) {
            store.addChapter({ ...ch, projectId: currentProjectId })
          }
        }
        if (data.scenes) {
          for (const sc of data.scenes) {
            store.addScene({ ...sc, projectId: currentProjectId })
          }
        }
        if (data.characters) {
          for (const c of data.characters) {
            store.addCharacter({ ...c, projectId: currentProjectId })
          }
        }
        if (data.locations) {
          for (const l of data.locations) {
            store.addLocation({ ...l, projectId: currentProjectId })
          }
        }
      } else {
        // Plain text: create a single chapter with the content
        const title = fileInfo.name.replace(/\.[^/.]+$/, "")
        const ch = store.addChapter({ projectId: currentProjectId, title })
        store.addScene({ projectId: currentProjectId, chapterId: ch.id, title: 'Content', content: fileInfo.content, wordCount: fileInfo.content.split(/\s+/).length })
      }

      toast({
        title: "Import successful",
        description: `Imported data into your project.`,
      })
      setFileInfo(null)
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const FormatIcon = fileInfo ? getFormatIcon(fileInfo.format) : null

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs font-medium">Drop a file here or click to browse</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Supported: .md, .json, .txt
        </p>
      </div>

      {/* File preview */}
      {fileInfo && FormatIcon && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
            <div className="flex items-center gap-2">
              <FormatIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">{fileInfo.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(fileInfo.size)} · {fileInfo.format.toUpperCase()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-6 p-0"
              onClick={() => setFileInfo(null)}
            >
              <X className="size-3" />
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">Preview</p>
            <div className="rounded-md bg-muted/30 border p-2 max-h-32 overflow-y-auto">
              <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono">
                {fileInfo.preview}
                {fileInfo.content.length > 500 && "..."}
              </pre>
            </div>
          </div>

          <Button
            onClick={() => setShowConfirm(true)}
            disabled={importing || !currentProjectId}
            className="w-full text-xs gap-2"
            size="sm"
          >
            {importing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle className="size-3.5" />
            )}
            {importing ? "Importing..." : "Import File"}
          </Button>
        </div>
      )}

      {!currentProjectId && (
        <p className="text-[10px] text-muted-foreground text-center">
          Select a project to enable import
        </p>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Import</AlertDialogTitle>
            <AlertDialogDescription>
              This will add the imported content to your current project. Existing
              content will not be modified. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
