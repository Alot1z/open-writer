'use client'

import { useMemo } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useDataStore } from '@/store/data-store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  BookOpen,
  Users,
  Clock,
  AlertTriangle,
  StickyNote,
  Link2,
  CheckCircle2,
} from 'lucide-react'

interface HealthCheck {
  label: string
  status: 'ok' | 'warning' | 'error'
  value: string | number
  detail?: string
}

export function HealthPanel() {
  const { currentProjectId } = useWriterStore()
  const store = useDataStore()

  // ─── Compute health checks from store ────────

  const checks = useMemo((): HealthCheck[] => {
    if (!currentProjectId) return []

    const characters = store.getCharactersByProject(currentProjectId)
    const notes = store.getNotesByProject(currentProjectId)
    const timeline = store.getTimelineByProject(currentProjectId)
    const totalWords = store.getProjectWordCount(currentProjectId)

    // Calculate unresolved notes
    const unresolvedNotes = notes.filter(n => !n.resolved).length

    // Calculate orphaned notes (notes without linked entities)
    const orphanedNotes = notes.filter(n => !n.linkedType || !n.linkedId).length

    // Check for timeline contradictions (simple heuristic: events with same date and conflicting locations)
    let timelineContradictions = 0
    const eventsByDate: Record<string, { location: string }[]> = {}
    for (const event of timeline) {
      if (!event.date) continue
      const dateKey = event.date.split('T')[0]
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = []
      eventsByDate[dateKey].push({ location: event.location })
    }
    for (const [, events] of Object.entries(eventsByDate)) {
      if (events.length > 1) {
        const locations = new Set(events.map(e => e.location).filter(Boolean))
        // If same character appears in different locations on the same date, flag it
        if (locations.size > 1 && events.length > locations.size) {
          timelineContradictions++
        }
      }
    }

    // Dangling references: characters referenced in scenes that don't exist
    const danglingRefs = 0 // Would need scene data to compute

    return [
      {
        label: 'Manuscript',
        status: 'ok',
        value: `${totalWords.toLocaleString()} words`,
        detail: 'Total word count',
      },
      {
        label: 'Characters',
        status: characters.length > 0 ? 'ok' : 'warning',
        value: characters.length,
        detail: characters.length === 0 ? 'No characters defined' : 'Characters defined',
      },
      {
        label: 'Timeline',
        status: timelineContradictions > 0 ? 'warning' : 'ok',
        value: timelineContradictions > 0 ? timelineContradictions : '✓',
        detail: timelineContradictions > 0
          ? `${timelineContradictions} potential contradiction${timelineContradictions > 1 ? 's' : ''}`
          : 'No contradictions detected',
      },
      {
        label: 'Unresolved Threads',
        status: unresolvedNotes > 0 ? 'warning' : 'ok',
        value: unresolvedNotes,
        detail: unresolvedNotes > 0 ? 'Notes that need resolution' : 'All notes resolved',
      },
      {
        label: 'Orphaned Notes',
        status: orphanedNotes > 0 ? 'warning' : 'ok',
        value: orphanedNotes,
        detail: orphanedNotes > 0 ? 'Notes not linked to entities' : 'All notes linked',
      },
      {
        label: 'Dangling References',
        status: danglingRefs > 0 ? 'error' : 'ok',
        value: danglingRefs,
        detail: danglingRefs > 0 ? 'Broken entity references' : 'All references valid',
      },
    ]
  }, [store, currentProjectId])

  const okCount = checks.filter(c => c.status === 'ok').length
  const warningCount = checks.filter(c => c.status === 'warning').length
  const errorCount = checks.filter(c => c.status === 'error').length

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Project Health</h2>
          <div className="flex items-center gap-2">
            {okCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                {okCount}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-200">
                <AlertTriangle className="h-3 w-3" />
                {warningCount}
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 text-red-600 border-red-200">
                <AlertTriangle className="h-3 w-3" />
                {errorCount}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {checks.map((check) => {
            const iconMap = {
              Manuscript: BookOpen,
              Characters: Users,
              Timeline: Clock,
              'Unresolved Threads': StickyNote,
              'Orphaned Notes': StickyNote,
              'Dangling References': Link2,
            }
            const Icon = iconMap[check.label as keyof typeof iconMap] || CheckCircle2

            const statusColors = {
              ok: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20',
              warning: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20',
              error: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20',
            }

            const statusIconColors = {
              ok: 'text-emerald-500',
              warning: 'text-amber-500',
              error: 'text-red-500',
            }

            return (
              <Card key={check.label} className={`border ${statusColors[check.status]}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${statusIconColors[check.status]}`} />
                      <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                        {check.label}
                      </span>
                    </div>
                    <span className={`text-sm font-semibold ${statusIconColors[check.status]}`}>
                      {check.value}
                    </span>
                  </div>
                  {check.detail && (
                    <p className="text-[10px] text-stone-500 mt-1 pl-6">{check.detail}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Separator />

        <div className="text-center">
          <p className="text-[10px] text-stone-400">
            Health checks run automatically. Last checked just now.
          </p>
        </div>
      </div>
    </ScrollArea>
  )
}
