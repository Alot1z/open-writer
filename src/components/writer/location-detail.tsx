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

interface Location {
  id: string
  name: string
  type: string
  description: string
  atmosphere: string
  history: string
  features: string
  ownership: string
  parentLocationId: string
  tags: string
}

const TYPE_OPTIONS = ['city', 'town', 'village', 'building', 'room', 'landscape', 'region', 'country', 'other']

interface LocationDetailProps {
  locationId?: string
}

export function LocationDetail({ locationId: locationIdProp }: LocationDetailProps = {}) {
  const { selectedLocationId, setRightPanel, setSelectedLocation } = useWriterStore()
  const effectiveId = locationIdProp ?? selectedLocationId
  const { toast } = useToast()
  const [location, setLocation] = useState<Location | null>(null)
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load every location in the project so the parent selector can show names
  useEffect(() => {
    const projectId = useWriterStore.getState().currentProjectId
    if (!projectId) return
    fetch(`/api/locations?projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setAllLocations)
      .catch(() => {})
  }, [effectiveId])
  const fetchLocation = useCallback(async () => {
    if (!effectiveId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/locations/${effectiveId}`)
      if (res.ok) {
        const data = await res.json()
        setLocation(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [effectiveId])

  useEffect(() => {
    fetchLocation()
  }, [fetchLocation])

  const saveField = useCallback(
    (field: string, value: string) => {
      if (!location) return
      setLocation((prev) => (prev ? { ...prev, [field]: value } : prev))

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSaving(true)
        try {
          const res = await fetch(`/api/locations/${location.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value }),
          })
          if (res.ok) {
            toast({ title: 'Saved', description: 'Location updated' })
          }
        } catch {
          // silent
        } finally {
          setSaving(false)
        }
      }, 800)
    },
    [location, toast]
  )

  const handleDelete = async () => {
    if (!location) return
    try {
      const res = await fetch(`/api/locations/${location.id}`, { method: 'DELETE' })
      if (res.ok) {
        setSelectedLocation(null)
        setRightPanel('none')
        toast({ title: 'Deleted', description: 'Location removed' })
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

  if (!location) {
    return <div className="p-6 text-center text-sm text-stone-500">Select a location to view details</div>
  }

  const tags = parseTags(location.tags)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Input
              value={location.name}
              onChange={(e) => saveField('name', e.target.value)}
              className="text-lg font-semibold border-transparent hover:border-stone-300 focus:border-stone-400 bg-transparent h-8 px-1"
            />
            <div className="flex items-center gap-2 mt-1 px-1">
              <Select value={location.type} onValueChange={(v) => saveField('type', v)}>
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
                <AlertDialogTitle>Delete Location</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &ldquo;{location.name}&rdquo;? This action cannot be undone.
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
            value={location.description}
            onChange={(e) => saveField('description', e.target.value)}
            placeholder="Describe this location..."
            className="text-sm min-h-[80px] resize-y"
          />
        </div>

        {/* Atmosphere */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Atmosphere</Label>
          <Textarea
            value={location.atmosphere}
            onChange={(e) => saveField('atmosphere', e.target.value)}
            placeholder="What does it feel like here?"
            className="text-sm min-h-[60px] resize-y"
          />
        </div>

        {/* History */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">History</Label>
          <Textarea
            value={location.history}
            onChange={(e) => saveField('history', e.target.value)}
            placeholder="History of this location..."
            className="text-sm min-h-[80px] resize-y"
          />
        </div>

        {/* Features */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Features</Label>
          <Textarea
            value={location.features}
            onChange={(e) => saveField('features', e.target.value)}
            placeholder="Notable features..."
            className="text-sm min-h-[60px] resize-y"
          />
        </div>

        {/* Ownership */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Ownership</Label>
          <Input
            value={location.ownership || ""}
            onChange={(e) => saveField('ownership', e.target.value)}
            placeholder="Who owns or controls this location"
            className="h-8 text-sm"
          />
        </div>

        <Separator />

        {/* Parent Location */}
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-500">Parent Location</Label>
          <Select
            value={location.parentLocationId}
            onValueChange={(v) => saveField('parentLocationId', v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select a parent location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {allLocations
                .filter((l) => l.id !== location.id)
                .map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
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
