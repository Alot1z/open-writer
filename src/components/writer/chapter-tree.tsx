'use client'

import React, { useMemo, useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useDataStore } from '@/store/data-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  FileText,
  FolderOpen,
  Trash2,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChapterTree() {
  const {
    currentProjectId,
    currentChapterId,
    currentSceneId,
    setCurrentChapter,
    setCurrentScene,
  } = useWriterStore()

  const store = useDataStore()

  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addSceneDialogOpen, setAddSceneDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [targetChapterId, setTargetChapterId] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<{ type: 'chapter' | 'scene'; id: string; currentTitle: string } | null>(null)

  // Derive chapters with their scenes from the data store
  const chapters = useMemo(() => {
    if (!currentProjectId) return []
    const chapterList = store.getChaptersByProject(currentProjectId)
    return chapterList.map(ch => ({
      ...ch,
      scenes: store.getScenesByChapter(ch.id),
    }))
  }, [currentProjectId, store])

  // Compute expanded chapters: auto-expand first chapter and the currently selected chapter
  const effectiveExpanded = useMemo(() => {
    const set = new Set(expandedChapters)
    // Auto-expand first chapter
    if (chapters.length > 0) {
      set.add(chapters[0].id)
    }
    // Always expand the currently selected chapter
    if (currentChapterId) {
      set.add(currentChapterId)
    }
    return set
  }, [expandedChapters, chapters, currentChapterId])

  const toggleExpand = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(chapterId)) next.delete(chapterId)
      else next.add(chapterId)
      return next
    })
  }

  // Add chapter
  const handleAddChapter = () => {
    if (!currentProjectId || !newItemTitle.trim()) return
    const chapter = store.addChapter({
      projectId: currentProjectId,
      title: newItemTitle.trim(),
      order: store.getChaptersByProject(currentProjectId).length,
    })
    setExpandedChapters((prev) => new Set([...prev, chapter.id]))
    setNewItemTitle('')
    setAddDialogOpen(false)
  }

  // Add scene
  const handleAddScene = () => {
    if (!targetChapterId || !newItemTitle.trim() || !currentProjectId) return
    store.addScene({
      projectId: currentProjectId,
      chapterId: targetChapterId,
      title: newItemTitle.trim(),
      content: '',
      order: store.getScenesByChapter(targetChapterId).length,
      wordCount: 0,
    })
    setNewItemTitle('')
    setAddSceneDialogOpen(false)
    setTargetChapterId(null)
  }

  // Delete chapter
  const handleDeleteChapter = (chapterId: string) => {
    store.deleteChapter(chapterId)
    if (currentChapterId === chapterId) {
      setCurrentChapter(null)
    }
  }

  // Delete scene
  const handleDeleteScene = (sceneId: string) => {
    store.deleteScene(sceneId)
    if (currentSceneId === sceneId) {
      setCurrentScene(null)
    }
  }

  // Rename
  const handleRename = () => {
    if (!renameTarget || !newItemTitle.trim()) return
    if (renameTarget.type === 'chapter') {
      store.updateChapter(renameTarget.id, { title: newItemTitle.trim() })
    } else {
      store.updateScene(renameTarget.id, { title: newItemTitle.trim() })
    }
    setRenameTarget(null)
    setRenameDialogOpen(false)
    setNewItemTitle('')
  }

  const getChapterWordCount = (chapter: { scenes: { wordCount: number }[] }) =>
    chapter.scenes.reduce((sum, s) => sum + s.wordCount, 0)

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {chapters.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No chapters yet. Create one to get started.
            </div>
          )}
          {chapters.map((chapter) => {
            const isExpanded = effectiveExpanded.has(chapter.id)
            const isActiveChapter = currentChapterId === chapter.id
            const chapterWords = getChapterWordCount(chapter)

            return (
              <div key={chapter.id}>
                {/* Chapter Row */}
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <button
                      onClick={() => {
                        toggleExpand(chapter.id)
                        setCurrentChapter(chapter.id)
                      }}
                      className={cn(
                        'flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
                        'hover:bg-accent/50',
                        isActiveChapter && !currentSceneId && 'bg-accent text-accent-foreground font-medium',
                      )}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1 text-left">{chapter.title}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal">
                        {chapterWords}
                      </Badge>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => {
                        setTargetChapterId(chapter.id)
                        setNewItemTitle('')
                        setAddSceneDialogOpen(true)
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-2" />
                      Add Scene
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        setRenameTarget({ type: 'chapter', id: chapter.id, currentTitle: chapter.title })
                        setNewItemTitle(chapter.title)
                        setRenameDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteChapter(chapter.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>

                {/* Scenes */}
                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {chapter.scenes.map((scene) => {
                      const isActiveScene = currentSceneId === scene.id
                      return (
                        <ContextMenu key={scene.id}>
                          <ContextMenuTrigger asChild>
                            <button
                              onClick={() => {
                                setCurrentChapter(chapter.id)
                                setCurrentScene(scene.id)
                              }}
                              className={cn(
                                'flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
                                'hover:bg-accent/50',
                                isActiveScene && 'bg-accent text-accent-foreground font-medium',
                              )}
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate flex-1 text-left">{scene.title}</span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                {scene.wordCount}
                              </span>
                            </button>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              onClick={() => {
                                setRenameTarget({ type: 'scene', id: scene.id, currentTitle: scene.title })
                                setNewItemTitle(scene.title)
                                setRenameDialogOpen(true)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Rename
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteScene(scene.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )
                    })}
                    {/* Quick add scene */}
                    <button
                      onClick={() => {
                        setTargetChapterId(chapter.id)
                        setNewItemTitle('')
                        setAddSceneDialogOpen(true)
                      }}
                      className="flex items-center gap-1.5 w-full px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add scene
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Add Chapter Button */}
      <div className="p-2 border-t border-writer-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setNewItemTitle('')
            setAddDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Add Chapter
        </Button>
      </div>

      {/* Add Chapter Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Chapter</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Chapter title..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddChapter()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddChapter} disabled={!newItemTitle.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Scene Dialog */}
      <Dialog open={addSceneDialogOpen} onOpenChange={setAddSceneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Scene</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Scene title..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddScene()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSceneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddScene} disabled={!newItemTitle.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.type === 'chapter' ? 'Chapter' : 'Scene'}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="New title..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newItemTitle.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
