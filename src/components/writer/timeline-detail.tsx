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

interface TimelineEvent {
  id: string
  title: string
  date: string
  time: string
  duration: string
  location: string
  description: string
  characters: string
  objects: string
  cause: string
  consequence: string
  eventType: string
  tags: string
}

const EVENT_TYPE_OPTIONS = [
  'birth', 'death', 'battle', 'meeting', 'discovery',
  'journey', 'political', 'romantic', 'mystery', 'custom',
]

interface TimelineDetailProps {
  eventId?: string
}

export function TimelineDetail({ eventId: eventIdProp }: TimelineDetailProps = {}) {
  const { selectedTimelineEventId, setRightPanel, setSelectedTimelineEvent } = useWriterStore()
  const effectiveId = eventIdProp ?? selectedTimelineEventId
  const store = useDataStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load timeline event directly from data store
  const rawEvent = effectiveId ? store.getTimelineEvent(effectiveId) : undefined
  const event: TimelineEvent | null = rawEvent
    ? {
        id: rawEvent.id,
        title: rawEvent.title,
        date: rawEvent.date ?? '',
        time: rawEvent.time ?? '',
        duration: rawEvent.duration ?? '',
        location: rawEvent.location ?? '',
        description: rawEvent.description ?? '',
        characters: rawEvent.characters ?? '[]',
        objects: rawEvent.objects ?? '[]',
        cause: rawEvent.cause ?? '',
        consequence: rawEvent.consequence ?? '',
        eventType: rawEvent.eventType ?? 'custom',
        tags: rawEvent.tags ?? '[]',
      }
    : null

  const saveField = (field: string, value: string) => {
    if (!rawEvent) return
    setSaving(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      store.updateTimelineEvent(rawEvent.id, { [field]: value } as Partial<import('@/store/data-store').TimelineEvent>)
      setSaving(false)
      toast({ title: 'Saved', description: 'Event updated' })
    }, 800)
  }

  const handleDelete = () => {
    if (!rawEvent) return
    store.deleteTimelineEvent(rawEvent.id)
    setSelectedTimelineEvent(null)
    setRightPanel('none')
    toast({ title: 'Deleted', description: 'Event removed' })
  }

  const parseJsonList = (str: string): string[] => {
    try { return JSON.parse(str || '[]') } catch { return [] }
  }

  if (!effectiveId) {
    return <div className="p-6 text-center text-sm text-stone-500">Select a timeline event to view details</div>
  }

  if (!event) {
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

  const characters = parseJsonList(event.characters)
  const objects = parseJsonList(event.objects)
  const tags = parseJsonList(event.tags)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Input
              value={event.title}
              onChange={(e) => saveField('title', e.target.value)}
              className="text-lg font-semibold border-transparent hover:border-stone-300 focus:border-stone-400 bg-transparent h-8 px-1"
            />
            <div className="flex items-center gap-2 mt-1 px-1">
              <Select value={event.eventType} onValueChange={(v) => saveField('eventType', v)}>
                <SelectTrigger className="h-6 w-32 text-xs border-transparent hover:border-stone-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((t) => (
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
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &ldquo;{event.title}&rdquo;? This action cannot be undone.
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

        {/* Date, Time, Duration */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Date</Label>
            <Input
              value={event.date}
              onChange={(e) => saveField('date', e.target.value)}
              placeholder="Date"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Time</Label>
            <Input
              value={event.time}
              onChange={(e) => saveField('time', e.target.value)}
              placeholder="Time"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Duration</Label>
            <Input
              value={event.duration}
              onChange={(e) => saveField('duration', e.target.value)}
              placeholder="Duration"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Location</Label>
          <Input
            value={event.location}
            onChange={(e) => saveField('location', e.target.value)}
            placeholder="Where does this happen?"
            className="h-8 text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Description</Label>
          <Textarea
            value={event.description}
            onChange={(e) => saveField('description', e.target.value)}
            placeholder="Describe this event..."
            className="text-sm min-h-[80px] resize-y"
          />
        </div>

        <Separator />

        {/* Characters */}
        <div className="space-y-2">
          <Label className="text-xs text-stone-500">Characters</Label>
          <div className="flex flex-wrap gap-1.5">
            {characters.length > 0 ? (
              characters.map((c: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{c}</Badge>
              ))
            ) : (
              <span className="text-xs text-stone-400">No characters</span>
            )}
          </div>
          <Input
            placeholder="Add character and press Enter"
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                const newList = [...characters, e.currentTarget.value.trim()]
                saveField('characters', JSON.stringify(newList))
                e.currentTarget.value = ''
              }
            }}
          />
        </div>

        {/* Objects */}
        <div className="space-y-2">
          <Label className="text-xs text-stone-500">Objects</Label>
          <div className="flex flex-wrap gap-1.5">
            {objects.length > 0 ? (
              objects.map((o: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{o}</Badge>
              ))
            ) : (
              <span className="text-xs text-stone-400">No objects</span>
            )}
          </div>
          <Input
            placeholder="Add object and press Enter"
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                const newList = [...objects, e.currentTarget.value.trim()]
                saveField('objects', JSON.stringify(newList))
                e.currentTarget.value = ''
              }
            }}
          />
        </div>

        <Separator />

        {/* Cause & Consequence */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Cause</Label>
          <Textarea
            value={event.cause}
            onChange={(e) => saveField('cause', e.target.value)}
            placeholder="What caused this event?"
            className="text-sm min-h-[60px] resize-y"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Consequence</Label>
          <Textarea
            value={event.consequence}
            onChange={(e) => saveField('consequence', e.target.value)}
            placeholder="What resulted from this event?"
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
