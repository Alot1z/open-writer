'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  MessageSquare,
  Plus,
  Check,
  RotateCcw,
  Filter,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────

interface Comment {
  id: string
  projectId: string
  chapterId?: string
  sceneId?: string
  content: string
  author: string
  resolved: boolean
  createdAt: string
  updatedAt: string
}

type FilterMode = 'all' | 'unresolved' | 'resolved'

// ─── Helpers ─────────────────────────────────────

/** Parse the raw DB row into our Comment interface, extracting author from metadata JSON. */
function parseComment(raw: {
  id: string
  projectId: string
  sceneId: string | null
  content: string
  resolved: boolean
  metadata: string
  createdAt: string
  updatedAt: string
}): Comment {
  let author = 'You'
  try {
    const meta = JSON.parse(raw.metadata || '{}')
    if (meta.author) author = meta.author
  } catch {
    // keep default
  }
  return {
    id: raw.id,
    projectId: raw.projectId,
    sceneId: raw.sceneId ?? undefined,
    content: raw.content,
    author,
    resolved: raw.resolved,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ─── Component ───────────────────────────────────

export function CommentsPanel() {
  const { currentProjectId, currentChapterId, currentSceneId } = useWriterStore()
  const { toast } = useToast()

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [resolvedOpen, setResolvedOpen] = useState(true)

  // ─── Fetch ────────────────────────────────────

  const fetchComments = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      let url = `/api/comments?projectId=${currentProjectId}`
      if (currentSceneId) {
        url += `&sceneId=${currentSceneId}`
      } else if (currentChapterId) {
        url += `&chapterId=${currentChapterId}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setComments(data.map(parseComment))
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProjectId, currentChapterId, currentSceneId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // ─── Add comment ──────────────────────────────

  const handleAdd = async () => {
    if (!currentProjectId || !newContent.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          sceneId: currentSceneId || null,
          content: newContent.trim(),
          author: 'You',
        }),
      })
      if (res.ok) {
        const raw = await res.json()
        const comment = parseComment(raw)
        setComments((prev) => [comment, ...prev])
        setNewContent('')
        setShowAddDialog(false)
        toast({ title: 'Comment added', description: 'Your comment has been saved' })
      } else {
        toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Toggle resolved ─────────────────────────

  const handleToggleResolved = async (comment: Comment) => {
    setTogglingId(comment.id)
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !comment.resolved }),
      })
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === comment.id ? { ...c, resolved: !c.resolved } : c))
        )
        toast({
          title: comment.resolved ? 'Comment reopened' : 'Comment resolved',
          description: comment.resolved
            ? 'Comment moved back to active'
            : 'Comment marked as resolved',
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update comment', variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  // ─── Derived data ─────────────────────────────

  const unresolved = comments.filter((c) => !c.resolved)
  const resolved = comments.filter((c) => c.resolved)

  const visibleUnresolved = filter === 'resolved' ? [] : unresolved
  const visibleResolved = filter === 'unresolved' ? [] : resolved

  const totalCount = comments.length
  const unresolvedCount = unresolved.length
  const resolvedCount = resolved.length

  // ─── Render ───────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="p-4 space-y-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Comments
            </h2>
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                {totalCount}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddDialog(true)}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-stone-400 mr-1" />
          {(
            [
              { key: 'all', label: 'All', count: totalCount },
              { key: 'unresolved', label: 'Open', count: unresolvedCount },
              { key: 'resolved', label: 'Resolved', count: resolvedCount },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === key
                  ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {label}
              {count > 0 && (
                <span className="text-[10px] text-stone-400">{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Scope hint ── */}
        {(currentSceneId || currentChapterId) && (
          <p className="text-[10px] text-stone-400">
            {currentSceneId
              ? 'Showing comments for current scene'
              : 'Showing comments for current chapter'}
          </p>
        )}
      </div>

      {/* ── Body ── */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : totalCount === 0 ? (
          <div className="p-6 text-center space-y-2">
            <MessageSquare className="h-8 w-8 mx-auto text-stone-300 dark:text-stone-600" />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No comments yet.
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Add a comment to start a discussion.
            </p>
          </div>
        ) : visibleUnresolved.length === 0 && visibleResolved.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No comments match your filter.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* ── Unresolved comments ── */}
            {visibleUnresolved.map((comment) => (
              <div
                key={comment.id}
                className="p-3 rounded-lg transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    <MessageSquare className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-stone-900 dark:text-stone-100">
                        {comment.author}
                      </span>
                      <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-1 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleResolved(comment)}
                        disabled={togglingId === comment.id}
                        className="h-6 px-2 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        {togglingId === comment.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* ── Resolved comments (collapsible) ── */}
            {visibleResolved.length > 0 && (
              <>
                {visibleUnresolved.length > 0 && (
                  <Separator className="my-2" />
                )}
                <Collapsible
                  open={resolvedOpen}
                  onOpenChange={setResolvedOpen}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50">
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                          Resolved
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 font-normal"
                        >
                          {visibleResolved.length}
                        </Badge>
                      </div>
                      {resolvedOpen ? (
                        <ChevronUp className="h-3.5 w-3.5 text-stone-400" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-1 mt-1">
                      {visibleResolved.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-3 rounded-lg opacity-60 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50 hover:opacity-80"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 shrink-0">
                              <Check className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-stone-900 dark:text-stone-100">
                                  {comment.author}
                                </span>
                                <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatRelativeTime(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words">
                                {comment.content}
                              </p>
                              <div className="flex items-center gap-1 pt-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleResolved(comment)}
                                  disabled={togglingId === comment.id}
                                  className="h-6 px-2 text-[11px] gap-1 text-stone-500 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
                                >
                                  {togglingId === comment.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-3 w-3" />
                                  )}
                                  Reopen
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* ── Add Comment Dialog ── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              Add Comment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Write your comment..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[100px] resize-none text-sm"
              autoFocus
            />
            <p className="text-[10px] text-stone-400">
              {currentSceneId
                ? 'Comment will be attached to the current scene'
                : currentChapterId
                  ? 'Comment will be attached to the current chapter'
                  : 'Comment will be attached to the project'}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddDialog(false)
                setNewContent('')
              }}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newContent.trim() || submitting}
              className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {submitting ? 'Adding...' : 'Add Comment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
