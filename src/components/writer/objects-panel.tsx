'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Package } from 'lucide-react'

interface StoryObject {
  id: string
  name: string
  type: string
  description: string
  owner: string
  location: string
  tags: string
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'artifact', label: 'Artifact' },
  { value: 'tool', label: 'Tool' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'food', label: 'Food/Drink' },
  { value: 'document', label: 'Document' },
  { value: 'treasure', label: 'Treasure' },
  { value: 'other', label: 'Other' },
]

const TYPE_COLORS: Record<string, string> = {
  weapon: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  artifact: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  tool: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
  clothing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  vehicle: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  food: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  document: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  treasure: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  other: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
}

export function ObjectsPanel() {
  const { currentProjectId, setRightPanel, setSelectedObject, selectedObjectId } = useWriterStore()
  const [objects, setObjects] = useState<StoryObject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchObjects = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/objects?projectId=${currentProjectId}`)
      if (res.ok) {
        const data = await res.json()
        setObjects(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    fetchObjects()
  }, [fetchObjects])

  const handleAdd = async () => {
    if (!currentProjectId) return
    try {
      const res = await fetch('/api/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          name: 'New Object',
          type: 'other',
        }),
      })
      if (res.ok) {
        const newObj = await res.json()
        setObjects((prev) => [...prev, newObj])
        setSelectedObject(newObj.id)
        setRightPanel('object-detail', newObj.id)
      }
    } catch {
      // silent
    }
  }

  const handleClick = (id: string) => {
    setSelectedObject(id)
    setRightPanel('object-detail', id)
  }

  const filtered = objects.filter((o) => {
    const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || o.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Objects</h2>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <Input
            placeholder="Search objects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              {objects.length === 0
                ? 'No objects yet. Create one to track important items in your story.'
                : 'No objects match your filter.'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filtered.map((obj) => (
              <button
                key={obj.id}
                onClick={() => handleClick(obj.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  selectedObjectId === obj.id
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    : ''
                }`}
              >
                <div className="h-8 w-8 rounded bg-stone-200 dark:bg-stone-700 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-stone-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {obj.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {obj.type && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 h-4 font-normal ${TYPE_COLORS[obj.type] || ''}`}
                      >
                        {obj.type}
                      </Badge>
                    )}
                    {obj.owner && (
                      <span className="text-[10px] text-stone-400 truncate">Owner: {obj.owner}</span>
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
