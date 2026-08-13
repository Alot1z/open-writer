'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, StickyNote, CheckCircle2 } from 'lucide-react'

interface Note {
  id: string
  title: string
  category: string
  content: string
  resolved: boolean
  priority: number
  tags: string
  updatedAt: string
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'research', label: 'Research' },
  { value: 'idea', label: 'Idea' },
  { value: 'todo', label: 'Todo' },
  { value: 'continuity', label: 'Continuity' },
  { value: 'worldbuilding', label: 'Worldbuilding' },
]

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
  research: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  idea: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  todo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  continuity: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  worldbuilding: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

export function NotesPanel() {
  const { currentProjectId, setRightPanel, setSelectedNote, selectedNoteId } = useWriterStore()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showResolved, setShowResolved] = useState(true)

  const fetchNotes = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/notes?projectId=${currentProjectId}`)
      if (res.ok) {
        const data = await res.json()
        setNotes(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleAdd = async () => {
    if (!currentProjectId) return
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          title: 'New Note',
          category: 'general',
        }),
      })
      if (res.ok) {
        const newNote = await res.json()
        setNotes((prev) => [newNote, ...prev])
        setSelectedNote(newNote.id)
        setRightPanel('note-detail', newNote.id)
      }
    } catch {
      // silent
    }
  }

  const handleClick = (id: string) => {
    setSelectedNote(id)
    setRightPanel('note-detail', id)
  }

  const filtered = notes.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || n.category === categoryFilter
    const matchesResolved = showResolved || !n.resolved
    return matchesSearch && matchesCategory && matchesResolved
  })

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Notes</h2>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="show-resolved"
            checked={showResolved}
            onCheckedChange={setShowResolved}
            className="scale-75 origin-left"
          />
          <Label htmlFor="show-resolved" className="text-xs text-stone-500 cursor-pointer">
            Show resolved
          </Label>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {notes.length === 0
                ? 'No notes yet. Create one to capture ideas and research.'
                : 'No notes match your filter.'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filtered.map((note) => (
              <button
                key={note.id}
                onClick={() => handleClick(note.id)}
                className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  selectedNoteId === note.id
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    : ''
                } ${note.resolved ? 'opacity-60' : ''}`}
              >
                <div className="mt-0.5 shrink-0">
                  {note.resolved ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <StickyNote className="h-4 w-4 text-stone-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {note.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {note.category && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 h-4 font-normal ${CATEGORY_COLORS[note.category] || ''}`}
                      >
                        {note.category}
                      </Badge>
                    )}
                    {note.priority > 0 && (
                      <span className="text-[10px] text-amber-600">P{note.priority}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
