'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
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

interface WorldElement {
  id: string
  name: string
  category: string
  description: string
  parent: string
  rules: string
  history: string
  tags: string
}

const CATEGORIES = [
  { value: 'faction', label: 'Faction' },
  { value: 'culture', label: 'Culture' },
  { value: 'religion', label: 'Religion' },
  { value: 'organization', label: 'Organization' },
  { value: 'government', label: 'Government' },
  { value: 'technology', label: 'Technology' },
  { value: 'magic', label: 'Magic' },
  { value: 'species', label: 'Species' },
  { value: 'rule', label: 'Rule' },
  { value: 'concept', label: 'Concept' },
]

interface WorldDetailProps {
  worldId?: string
}

export function WorldDetail({ worldId: worldIdProp }: WorldDetailProps = {}) {
  const { selectedWorldId, setRightPanel, setSelectedWorld } = useWriterStore()
  const effectiveId = worldIdProp ?? selectedWorldId
  const { toast } = useToast()
  const [element, setElement] = useState<WorldElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchElement = useCallback(async () => {
    if (!effectiveId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/world/${effectiveId}`)
      if (res.ok) {
        const data = await res.json()
        setElement(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [effectiveId])

  useEffect(() => {
    fetchElement()
  }, [fetchElement])

  const saveField = useCallback(
    (field: string, value: string) => {
      if (!element) return
      setElement((prev) => (prev ? { ...prev, [field]: value } : prev))

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSaving(true)
        try {
          const res = await fetch(`/api/world/${element.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value }),
          })
          if (res.ok) {
            toast({ title: 'Saved', description: 'World element updated' })
          }
        } catch {
          // silent
        } finally {
          setSaving(false)
        }
      }, 800)
    },
    [element, toast]
  )

  const handleDelete = async () => {
    if (!element) return
    try {
      const res = await fetch(`/api/world/${element.id}`, { method: 'DELETE' })
      if (res.ok) {
        setSelectedWorld(null)
        setRightPanel('none')
        toast({ title: 'Deleted', description: 'World element removed' })
      }
    } catch {
      // silent
    }
  }

  const parseTags = (tagsStr: string): string[] => {
    try { return JSON.parse(tagsStr || '[]') } catch { return [] }
  }

  if (loading) {
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

  if (!element) {
    return <div className="p-6 text-center text-sm text-stone-500">Select a world element to view details</div>
  }

  const tags = parseTags(element.tags)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Input
              value={element.name}
              onChange={(e) => saveField('name', e.target.value)}
              className="text-lg font-semibold border-transparent hover:border-stone-300 focus:border-stone-400 bg-transparent h-8 px-1"
            />
            <div className="flex items-center gap-2 mt-1 px-1">
              <Select value={element.category} onValueChange={(v) => saveField('category', v)}>
                <SelectTrigger className="h-6 w-32 text-xs border-transparent hover:border-stone-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {c.label}
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
                <AlertDialogTitle>Delete World Element</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &ldquo;{element.name}&rdquo;? This action cannot be undone.
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

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Description</Label>
          <Textarea
            value={element.description}
            onChange={(e) => saveField('description', e.target.value)}
            placeholder="Describe this element..."
            className="text-sm min-h-[80px] resize-y"
          />
        </div>

        {/* Parent */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Parent</Label>
          <Input
            value={element.parent}
            onChange={(e) => saveField('parent', e.target.value)}
            placeholder="Parent element"
            className="h-8 text-sm"
          />
        </div>

        {/* Rules */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Rules</Label>
          <Textarea
            value={element.rules}
            onChange={(e) => saveField('rules', e.target.value)}
            placeholder="Rules and constraints..."
            className="text-sm min-h-[80px] resize-y"
          />
        </div>

        {/* History */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">History</Label>
          <Textarea
            value={element.history}
            onChange={(e) => saveField('history', e.target.value)}
            placeholder="History of this element..."
            className="text-sm min-h-[80px] resize-y"
          />
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
