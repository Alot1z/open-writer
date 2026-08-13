'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
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
  MoreHorizontal,
  Trash2,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Scene {
  id: string
  title: string
  content: string
  order: number
  wordCount: number
  chapterId: string
}

interface Chapter {
  id: string
  title: string
  order: number
  scenes: Scene[]
  projectId: string
}

export function ChapterTree() {
  const {
    currentProjectId,
    currentChapterId,
    currentSceneId,
    setCurrentChapter,
    setCurrentScene,
  } = useWriterStore()

  const [chapters, setChapters] = useState<Chapter[]>([])
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addSceneDialogOpen, setAddSceneDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [targetChapterId, setTargetChapterId] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<{ type: 'chapter' | 'scene'; id: string; currentTitle: string } | null>(null)

  // Fetch chapters
  const fetchChapters = useCallback(async () => {
    if (!currentProjectId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/chapters?projectId=${currentProjectId}`)
      if (res.ok) {
        const data = await res.json()
        setChapters(data)
        // Auto-expand first chapter
        if (data.length > 0 && expandedChapters.size === 0) {
          setExpandedChapters(new Set([data[0].id]))
        }
      }
    } catch (err) {
      console.error('Failed to fetch chapters:', err)
    } finally {
      setLoading(false)
    }
  }, [currentProjectId, expandedChapters.size])

  useEffect(() => {
    fetchChapters()
  }, [fetchChapters])

  // Auto-expand when chapter is selected
  useEffect(() => {
    if (currentChapterId) {
      setExpandedChapters((prev) => {
        if (prev.has(currentChapterId)) return prev
        const next = new Set(prev)
        next.add(currentChapterId)
        return next
      })
    }
  }, [currentChapterId])

  const toggleExpand = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(chapterId)) next.delete(chapterId)
      else next.add(chapterId)
      return next
    })
  }

  // Add chapter
  const handleAddChapter = async () => {
    if (!currentProjectId || !newItemTitle.trim()) return
    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: currentProjectId, title: newItemTitle.trim() }),
      })
      if (res.ok) {
        const chapter = await res.json()
        setChapters((prev) => [...prev, chapter])
        setExpandedChapters((prev) => new Set([...prev, chapter.id]))
        setNewItemTitle('')
        setAddDialogOpen(false)
      }
    } catch (err) {
      console.error('Failed to add chapter:', err)
    }
  }

  // Add scene
  const handleAddScene = async () => {
    if (!targetChapterId || !newItemTitle.trim()) return
    try {
      const res = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: targetChapterId, title: newItemTitle.trim() }),
      })
      if (res.ok) {
        const scene = await res.json()
        setChapters((prev) =>
          prev.map((ch) =>
            ch.id === targetChapterId
              ? { ...ch, scenes: [...ch.scenes, scene] }
              : ch
          )
        )
        setNewItemTitle('')
        setAddSceneDialogOpen(false)
        setTargetChapterId(null)
      }
    } catch (err) {
      console.error('Failed to add scene:', err)
    }
  }

  // Delete chapter
  const handleDeleteChapter = async (chapterId: string) => {
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, { method: 'DELETE' })
      if (res.ok) {
        setChapters((prev) => prev.filter((ch) => ch.id !== chapterId))
        if (currentChapterId === chapterId) {
          setCurrentChapter(null)
        }
      }
    } catch (err) {
      console.error('Failed to delete chapter:', err)
    }
  }

  // Delete scene
  const handleDeleteScene = async (sceneId: string, chapterId: string) => {
    try {
      const res = await fetch(`/api/scenes/${sceneId}`, { method: 'DELETE' })
      if (res.ok) {
        setChapters((prev) =>
          prev.map((ch) =>
            ch.id === chapterId
              ? { ...ch, scenes: ch.scenes.filter((s) => s.id !== sceneId) }
              : ch
          )
        )
        if (currentSceneId === sceneId) {
          setCurrentScene(null)
        }
      }
    } catch (err) {
      console.error('Failed to delete scene:', err)
    }
  }

  // Rename
  const handleRename = async () => {
    if (!renameTarget || !newItemTitle.trim()) return
    try {
      const endpoint =
        renameTarget.type === 'chapter'
          ? `/api/chapters/${renameTarget.id}`
          : `/api/scenes/${renameTarget.id}`
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newItemTitle.trim() }),
      })
      if (res.ok) {
        if (renameTarget.type === 'chapter') {
          setChapters((prev) =>
            prev.map((ch) =>
              ch.id === renameTarget.id ? { ...ch, title: newItemTitle.trim() } : ch
            )
          )
        } else {
          setChapters((prev) =>
            prev.map((ch) => ({
              ...ch,
              scenes: ch.scenes.map((s) =>
                s.id === renameTarget.id ? { ...s, title: newItemTitle.trim() } : s
              ),
            }))
          )
        }
        setRenameTarget(null)
        setRenameDialogOpen(false)
        setNewItemTitle('')
      }
    } catch (err) {
      console.error('Failed to rename:', err)
    }
  }

  const getChapterWordCount = (chapter: Chapter) =>
    chapter.scenes.reduce((sum, s) => sum + s.wordCount, 0)

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
        ))}
      </div>
    )
  }

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
            const isExpanded = expandedChapters.has(chapter.id)
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
                              onClick={() => handleDeleteScene(scene.id, chapter.id)}
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
