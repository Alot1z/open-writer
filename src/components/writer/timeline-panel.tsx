'use client'

import { useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useDataStore } from '@/store/data-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Clock, CalendarDays } from 'lucide-react'

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'birth', label: 'Birth' },
  { value: 'death', label: 'Death' },
  { value: 'battle', label: 'Battle' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'journey', label: 'Journey' },
  { value: 'political', label: 'Political' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'custom', label: 'Custom' },
]

const EVENT_TYPE_COLORS: Record<string, string> = {
  birth: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  death: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
  battle: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  meeting: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  discovery: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  journey: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  political: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  romantic: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  mystery: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  custom: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
}

export function TimelinePanel() {
  const { currentProjectId, setRightPanel, setSelectedTimelineEvent, selectedTimelineEventId } = useWriterStore()
  const store = useDataStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const events = currentProjectId ? store.getTimelineByProject(currentProjectId) : []

  const handleAdd = () => {
    if (!currentProjectId) return
    const newEvent = store.addTimelineEvent({
      projectId: currentProjectId,
      title: 'New Event',
      description: '',
      date: new Date().toISOString().split('T')[0],
    })
    setSelectedTimelineEvent(newEvent.id)
    setRightPanel('timeline-detail', newEvent.id)
  }

  const handleClick = (id: string) => {
    setSelectedTimelineEvent(id)
    setRightPanel('timeline-detail', id)
  }

  const filtered = events.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || e.description?.toLowerCase().includes(typeFilter)
    return matchesSearch && matchesType
  })

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Timeline</h2>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Filter by event type" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {events.length === 0
                ? 'No timeline events yet. Create one to chronicle your story.'
                : 'No events match your filter.'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filtered.map((event) => (
              <button
                key={event.id}
                onClick={() => handleClick(event.id)}
                className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  selectedTimelineEventId === event.id
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    : ''
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  <CalendarDays className="h-4 w-4 text-stone-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {event.date && (
                      <span className="text-[10px] text-stone-500">{event.date}</span>
                    )}
                    {event.description && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 h-4 font-normal`}
                      >
                        {event.description.slice(0, 20)}
                      </Badge>
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
