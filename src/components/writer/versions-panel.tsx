'use client'

import { useMemo, useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useDataStore } from '@/store/data-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { History, Star, Plus, Clock, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
  const store = useDataStore()
  const { toast } = useToast()
  const [previewVersion, setPreviewVersion] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  // ─── Derived versions from store ─────────────

  const versions = useMemo(() => {
    if (!currentProjectId) return []
    let result = store.getVersionsByProject(currentProjectId)
    if (currentSceneId) {
      result = result.filter(v => v.sceneId === currentSceneId)
    }
    return result
  }, [store, currentProjectId, currentSceneId])

  // ─── Create milestone ─────────────────────────

  const handleCreateMilestone = () => {
    if (!currentProjectId) return
    const sceneContent = currentSceneId
      ? (store.getScene(currentSceneId)?.content || '')
      : ''
    const wordCount = currentSceneId
      ? (store.getScene(currentSceneId)?.wordCount || 0)
      : 0
    store.addVersion({
      projectId: currentProjectId,
      sceneId: currentSceneId || '',
      content: sceneContent,
      label: 'Milestone',
      wordCount,
      isMilestone: true,
      isAutosave: false,
    })
    toast({ title: 'Milestone created', description: 'Version snapshot saved' })
  }

  // ─── Restore version ──────────────────────────

  const handleRestore = (versionId: string, sceneId: string, content: string) => {
    if (!sceneId || !content) return
    setRestoring(true)
    try {
      store.updateScene(sceneId, { content })
      toast({ title: 'Version restored', description: 'Scene content has been updated' })
    } catch {
      toast({ title: 'Restore failed', description: 'Could not update scene content', variant: 'destructive' })
    } finally {
      setRestoring(false)
    }
  }

  // Group versions by date
  const grouped: Record<string, typeof versions> = {}
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
        {versions.length === 0 ? (
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
                          onClick={() => setPreviewVersion(version.id)}
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
                            {version.content ? (
                              <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
                                {version.content}
                              </p>
                            ) : (
                              <p className="text-xs text-stone-400 italic">No content snapshot available</p>
                            )}
                          </div>
                          {version.sceneId && version.content && (
                            <>
                              <Separator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-1.5 text-xs"
                                    disabled={restoring}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    {restoring ? 'Restoring...' : 'Restore this version'}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Restore Version</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will replace the current scene content with this version&apos;s content. Are you sure you want to continue?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRestore(version.id, version.sceneId, version.content)}
                                      className="bg-amber-600 hover:bg-amber-700"
                                    >
                                      Restore
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
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
