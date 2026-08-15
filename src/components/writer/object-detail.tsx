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

interface StoryObject {
  id: string
  name: string
  type: string
  description: string
  owner: string
  location: string
  history: string
  appearance: string
  significance: string
  tags: string
}

const TYPE_OPTIONS = ['weapon', 'artifact', 'tool', 'clothing', 'vehicle', 'food', 'document', 'treasure', 'other']

interface ObjectDetailProps {
  objectId?: string
}

export function ObjectDetail({ objectId: objectIdProp }: ObjectDetailProps = {}) {
  const { selectedObjectId, setRightPanel, setSelectedObject } = useWriterStore()
  const effectiveId = objectIdProp ?? selectedObjectId
  const store = useDataStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load object directly from data store
  const rawObject = effectiveId ? store.getObject(effectiveId) : undefined
  const object: StoryObject | null = rawObject
    ? {
        id: rawObject.id,
        name: rawObject.name,
        type: rawObject.type,
        description: rawObject.description ?? '',
        owner: rawObject.owner ?? '',
        location: rawObject.location ?? '',
        history: rawObject.history ?? '',
        appearance: rawObject.appearance ?? '',
        significance: rawObject.significance ?? '',
        tags: rawObject.tags ?? '[]',
      }
    : null

  const saveField = (field: string, value: string) => {
    if (!rawObject) return
    setSaving(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      store.updateObject(rawObject.id, { [field]: value } as Partial<import('@/store/data-store').StoryObject>)
      setSaving(false)
      toast({ title: 'Saved', description: 'Object updated' })
    }, 800)
  }

  const handleDelete = () => {
    if (!rawObject) return
    store.deleteObject(rawObject.id)
    setSelectedObject(null)
    setRightPanel('none')
    toast({ title: 'Deleted', description: 'Object removed' })
  }

  const parseTags = (tagsStr: string): string[] => {
    try { return JSON.parse(tagsStr || '[]') } catch { return [] }
  }

  if (!effectiveId) {
    return <div className="p-6 text-center text-sm text-stone-500">Select an object to view details</div>
  }

  if (!object) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Separator />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const tags = parseTags(object.tags)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Input
              value={object.name}
              onChange={(e) => saveField('name', e.target.value)}
              className="text-lg font-semibold border-transparent hover:border-stone-300 focus:border-stone-400 bg-transparent h-8 px-1"
            />
            <div className="flex items-center gap-2 mt-1 px-1">
              <Select value={object.type} onValueChange={(v) => saveField('type', v)}>
                <SelectTrigger className="h-6 w-32 text-xs border-transparent hover:border-stone-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
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
                <AlertDialogTitle>Delete Object</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &ldquo;{object.name}&rdquo;? This action cannot be undone.
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

        {/* Owner & Location */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Owner</Label>
            <Input
              value={object.owner}
              onChange={(e) => saveField('owner', e.target.value)}
              placeholder="Who owns this?"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Location</Label>
            <Input
              value={object.location}
              onChange={(e) => saveField('location', e.target.value)}
              placeholder="Where is it?"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Description</Label>
          <Textarea
            value={object.description}
            onChange={(e) => saveField('description', e.target.value)}
            placeholder="Describe this object..."
            className="text-sm min-h-[80px] resize-y"
          />
        </div>

        {/* Appearance */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Appearance</Label>
          <Textarea
            value={object.appearance}
            onChange={(e) => saveField('appearance', e.target.value)}
            placeholder="Physical appearance..."
            className="text-sm min-h-[60px] resize-y"
          />
        </div>

        <Separator />

        {/* History */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">History</Label>
          <Textarea
            value={object.history}
            onChange={(e) => saveField('history', e.target.value)}
            placeholder="Origin and history..."
            className="text-sm min-h-[80px] resize-y"
          />
        </div>

        {/* Significance */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Significance</Label>
          <Textarea
            value={object.significance}
            onChange={(e) => saveField('significance', e.target.value)}
            placeholder="Why is this object important?"
            className="text-sm min-h-[60px] resize-y"
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
