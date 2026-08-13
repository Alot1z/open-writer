'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { History, Star, Plus, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Version {
  id: string
  sceneId: string | null
  content: string
  wordCount: number
  label: string
  isMilestone: boolean
  isAutosave: boolean
  createdAt: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VersionsPanel() {
  const { currentProjectId, currentSceneId } = useWriterStore()
  const { toast } = useToast()
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null)

  const fetchVersions = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      let url = `/api/versions?projectId=${currentProjectId}`
      if (currentSceneId) {
        url += `&sceneId=${currentSceneId}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setVersions(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProjectId, currentSceneId])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  const handleCreateMilestone = async () => {
    if (!currentProjectId) return
    try {
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          sceneId: currentSceneId || null,
          content: '',
          label: 'Milestone',
          isMilestone: true,
          isAutosave: false,
        }),
      })
      if (res.ok) {
        const newVersion = await res.json()
        setVersions((prev) => [newVersion, ...prev])
        toast({ title: 'Milestone created', description: 'Version snapshot saved' })
      }
    } catch {
      // silent
    }
  }

  // Group versions by date
  const grouped: Record<string, Version[]> = {}
  for (const v of versions) {
    const date = formatDate(v.createdAt)
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(v)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Versions</h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateMilestone}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Milestone
          </Button>
        </div>
        {currentSceneId && (
          <p className="text-[10px] text-stone-400">
            Showing versions for current scene
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No versions yet. Start writing to create version history.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {Object.entries(grouped).map(([date, dateVersions]) => (
              <div key={date}>
                <div className="px-2.5 py-1.5">
                  <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">
                    {date}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dateVersions.map((version) => (
                    <Dialog key={version.id}>
                      <DialogTrigger asChild>
                        <button
                          onClick={() => setPreviewVersion(version)}
                          className="w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                          <div className="mt-0.5 shrink-0">
                            {version.isMilestone ? (
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-stone-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                                {version.label || (version.isAutosave ? 'Autosave' : 'Version')}
                              </p>
                              {version.isAutosave && !version.isMilestone && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3 font-normal">
                                  auto
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-stone-500">
                                {formatTime(version.createdAt)}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                {version.wordCount.toLocaleString()} words
                              </span>
                            </div>
                          </div>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            {version.isMilestone && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                            {version.label || (version.isAutosave ? 'Autosave' : 'Version')}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-xs text-stone-500">
                            <span>{new Date(version.createdAt).toLocaleString()}</span>
                            <span>{version.wordCount.toLocaleString()} words</span>
                          </div>
                          <Separator />
                          <div className="max-h-64 overflow-y-auto rounded-md bg-stone-50 dark:bg-stone-900 p-3">
                            {previewVersion?.content ? (
                              <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
                                {previewVersion.content}
                              </p>
                            ) : (
                              <p className="text-xs text-stone-400 italic">No content snapshot available</p>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
