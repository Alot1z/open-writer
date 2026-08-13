"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useWriterStore } from "@/store/writer-store"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  Loader2,
  Download,
  RotateCcw,
  Trash2,
  Plus,
  Shield,
} from "lucide-react"

interface BackupInfo {
  id: string
  label: string
  wordCount: number
  createdAt: string
  checksum: string
  timestamp: string
  sizeBytes: number
  chapterCount: number
  characterCount: number
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function BackupPanel() {
  const { currentProjectId } = useWriterStore()
  const { toast } = useToast()
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchBackups = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/backup?projectId=${currentProjectId}`)
      if (res.ok) {
        const data = await res.json()
        setBackups(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    fetchBackups()
  }, [fetchBackups])

  const handleCreateBackup = async () => {
    if (!currentProjectId) return
    setCreating(true)
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }))
        throw new Error(err.error || "Failed to create backup")
      }
      toast({ title: "Backup created", description: "Your project has been backed up successfully." })
      fetchBackups()
    } catch (error) {
      toast({
        title: "Backup failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (id: string) => {
    setConfirmRestore(null)
    try {
      const res = await fetch(`/api/backup/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }))
        throw new Error(err.error || "Failed to restore")
      }
      toast({ title: "Backup restored", description: "Your project has been restored from backup." })
      fetchBackups()
    } catch (error) {
      toast({
        title: "Restore failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleDownload = async (id: string) => {
    try {
      const res = await fetch(`/api/backup/${id}`)
      if (!res.ok) throw new Error("Failed to download backup")
      const data = await res.json()
      const json = JSON.stringify(data.data, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup_${id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    setConfirmDelete(null)
    try {
      const res = await fetch(`/api/backup/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete backup")
      toast({ title: "Backup deleted", description: "The backup has been removed." })
      fetchBackups()
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleCreateBackup}
        disabled={creating || !currentProjectId}
        className="w-full text-xs gap-2"
        size="sm"
      >
        {creating ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Plus className="size-3.5" />
        )}
        {creating ? "Creating Backup..." : "Create Backup"}
      </Button>

      {!currentProjectId && (
        <p className="text-[10px] text-muted-foreground text-center">
          Select a project to manage backups
        </p>
      )}

      {/* Backup list */}
      <div className="space-y-1">
        <p className="text-xs font-medium">
          Existing Backups {backups.length > 0 && `(${backups.length})`}
        </p>

        {loading && (
          <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading backups...
          </div>
        )}

        {!loading && backups.length === 0 && (
          <p className="text-[10px] text-muted-foreground p-2">
            No backups yet. Create one to safeguard your work.
          </p>
        )}

        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="rounded-md border p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {backup.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(backup.createdAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] shrink-0">
                    {formatFileSize(backup.sizeBytes)}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{backup.wordCount} words</span>
                  <span>·</span>
                  <span>{backup.chapterCount} chapters</span>
                  <span>·</span>
                  <span>{backup.characterCount} characters</span>
                </div>

                {backup.checksum && (
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Shield className="size-2.5" />
                    <span className="font-mono truncate">{backup.checksum.slice(0, 16)}...</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] gap-1 h-6 flex-1"
                    onClick={() => handleDownload(backup.id)}
                  >
                    <Download className="size-2.5" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] gap-1 h-6 flex-1 text-amber-600 hover:text-amber-700"
                    onClick={() => setConfirmRestore(backup.id)}
                  >
                    <RotateCcw className="size-2.5" />
                    Restore
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] gap-1 h-6 text-destructive hover:text-destructive"
                    onClick={() => setConfirmDelete(backup.id)}
                  >
                    <Trash2 className="size-2.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Restore confirmation */}
      <AlertDialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current project data with the backup data.
              This action cannot be undone. Make sure to create a new backup
              first if you want to preserve your current work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRestore && handleRestore(confirmRestore)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this backup. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
