'use client'

import { useState, useRef } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useDataStore } from '@/store/data-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Trash2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Note {
  id: string
  title: string
  content: string
  category: string
  linkedType: string
  linkedId: string
  priority: number
  resolved: boolean
  tags: string
}

const CATEGORY_OPTIONS = ['general', 'research', 'idea', 'todo', 'continuity', 'worldbuilding']

const LINKED_TYPE_OPTIONS = ['', 'character', 'location', 'object', 'world', 'scene', 'chapter']

interface NoteDetailProps {
  noteId?: string
}

export function NoteDetail({ noteId: noteIdProp }: NoteDetailProps = {}) {
  const { selectedNoteId, setRightPanel, setSelectedNote } = useWriterStore()
  const effectiveId = noteIdProp ?? selectedNoteId
  const store = useDataStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load note directly from data store
  const rawNote = effectiveId ? store.getNote(effectiveId) : undefined
  const note: Note | null = rawNote
    ? {
        id: rawNote.id,
        title: rawNote.title,
        content: rawNote.content ?? '',
        category: rawNote.category ?? 'general',
        linkedType: rawNote.linkedType ?? '',
        linkedId: rawNote.linkedId ?? '',
        priority: rawNote.priority ?? 0,
        resolved: rawNote.resolved ?? false,
        tags: rawNote.tags ?? '[]',
      }
    : null

  const saveField = (field: string, value: string | number | boolean) => {
    if (!rawNote) return
    setSaving(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      store.updateNote(rawNote.id, { [field]: value } as Partial<import('@/store/data-store').Note>)
      setSaving(false)
      toast({ title: 'Saved', description: 'Note updated' })
    }, 800)
  }

  const handleDelete = () => {
    if (!rawNote) return
    store.deleteNote(rawNote.id)
    setSelectedNote(null)
    setRightPanel('none')
    toast({ title: 'Deleted', description: 'Note removed' })
  }

  const parseTags = (tagsStr: string): string[] => {
    try { return JSON.parse(tagsStr || '[]') } catch { return [] }
  }

  if (!effectiveId) {
    return <div className="p-6 text-center text-sm text-stone-500">Select a note to view details</div>
  }

  if (!note) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Separator />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const tags = parseTags(note.tags)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Input
              value={note.title}
              onChange={(e) => saveField('title', e.target.value)}
              className="text-lg font-semibold border-transparent hover:border-stone-300 focus:border-stone-400 bg-transparent h-8 px-1"
            />
            <div className="flex items-center gap-2 mt-1 px-1">
              <Select value={note.category} onValueChange={(v) => saveField('category', v)}>
                <SelectTrigger className="h-6 w-28 text-xs border-transparent hover:border-stone-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saving && (
                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                  <Save className="h-3 w-3" /> Saving...
                </span>
              )}
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Note</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &ldquo;{note.title}&rdquo;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator />

        {/* Resolved Toggle */}
        <div className="flex items-center gap-3">
          <Switch
            id="note-resolved"
            checked={note.resolved}
            onCheckedChange={(checked) => saveField('resolved', checked)}
          />
          <Label htmlFor="note-resolved" className="text-sm text-stone-700 dark:text-stone-300 cursor-pointer">
            {note.resolved ? 'Resolved' : 'Unresolved'}
          </Label>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Content</Label>
          <Textarea
            value={note.content}
            onChange={(e) => saveField('content', e.target.value)}
            placeholder="Write your note here..."
            className="text-sm min-h-[160px] resize-y"
          />
        </div>

        <Separator />

        {/* Linked Entity */}
        <div className="space-y-3">
          <Label className="text-xs text-stone-500">Linked Entity</Label>
          <div className="grid grid-cols-2 gap-3">
            <Select value={note.linkedType} onValueChange={(v) => saveField('linkedType', v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {LINKED_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t || 'none'} value={t || 'none'} className="text-xs">
                    {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'None'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={note.linkedId}
              onChange={(e) => saveField('linkedId', e.target.value)}
              placeholder="Entity ID"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Priority (0-5)</Label>
          <Select
            value={String(note.priority)}
            onValueChange={(v) => saveField('priority', parseInt(v, 10))}
          >
            <SelectTrigger className="h-8 text-sm w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5].map((p) => (
                <SelectItem key={p} value={String(p)} className="text-xs">
                  P{p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-2">
          <Label className="text-xs text-stone-500">Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {tags.length > 0 ? (
              tags.map((tag: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
              ))
            ) : (
              <span className="text-xs text-stone-400">No tags</span>
            )}
          </div>
          <Input
            placeholder="Add tag and press Enter"
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                const newTags = [...tags, e.currentTarget.value.trim()]
                saveField('tags', JSON.stringify(newTags))
                e.currentTarget.value = ''
              }
            }}
          />
        </div>
      </div>
    </ScrollArea>
  )
}
