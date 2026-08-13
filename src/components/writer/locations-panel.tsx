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
import { Plus, Search, MapPin } from 'lucide-react'

interface Location {
  id: string
  name: string
  type: string
  description: string
  atmosphere: string
  tags: string
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'city', label: 'City' },
  { value: 'town', label: 'Town' },
  { value: 'village', label: 'Village' },
  { value: 'building', label: 'Building' },
  { value: 'room', label: 'Room' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'region', label: 'Region' },
  { value: 'country', label: 'Country' },
  { value: 'other', label: 'Other' },
]

const TYPE_COLORS: Record<string, string> = {
  city: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  town: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  village: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  building: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
  room: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
  landscape: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  region: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  country: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  other: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
}

export function LocationsPanel() {
  const { currentProjectId, setRightPanel, setSelectedLocation, selectedLocationId } = useWriterStore()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchLocations = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/locations?projectId=${currentProjectId}`)
      if (res.ok) {
        const data = await res.json()
        setLocations(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  const handleAdd = async () => {
    if (!currentProjectId) return
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          name: 'New Location',
          type: 'other',
        }),
      })
      if (res.ok) {
        const newLoc = await res.json()
        setLocations((prev) => [...prev, newLoc])
        setSelectedLocation(newLoc.id)
        setRightPanel('location-detail', newLoc.id)
      }
    } catch {
      // silent
    }
  }

  const handleClick = (id: string) => {
    setSelectedLocation(id)
    setRightPanel('location-detail', id)
  }

  const filtered = locations.filter((l) => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || l.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Locations</h2>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <Input
            placeholder="Search locations..."
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
              {locations.length === 0
                ? 'No locations yet. Create one to build your world.'
                : 'No locations match your filter.'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filtered.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleClick(loc.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  selectedLocationId === loc.id
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    : ''
                }`}
              >
                <div className="h-8 w-8 rounded bg-stone-200 dark:bg-stone-700 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-stone-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {loc.name}
                  </p>
                  {loc.type && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 h-4 mt-0.5 font-normal ${TYPE_COLORS[loc.type] || ''}`}
                    >
                      {loc.type}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
