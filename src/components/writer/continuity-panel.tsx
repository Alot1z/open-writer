'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, ShieldCheck, AlertTriangle, Info, XCircle } from 'lucide-react'

interface ContinuityFinding {
  id: string
  type: string
  severity: 'info' | 'warning' | 'error'
  confidence: number
  problem: string
  evidence: string
  source: string[]
  affected: string[]
}

interface ContinuityReport {
  projectId: string
  findings: ContinuityFinding[]
  generatedAt: string
  stats: Record<string, number>
}

const SEVERITY_STYLE: Record<string, string> = {
  info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  warning: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const SEVERITY_ICON: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
}

export function ContinuityPanel() {
  const { currentProjectId } = useWriterStore()
  const [report, setReport] = useState<ContinuityReport | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/continuity?projectId=${currentProjectId}`)
      if (res.ok) setReport(await res.json())
    } catch {
      // Local API only — ignore transient failures
    } finally {
      setLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const findings = report?.findings ?? []
  const errors = findings.filter((f) => f.severity === 'error')
  const warnings = findings.filter((f) => f.severity === 'warning')
  const infos = findings.filter((f) => f.severity === 'info')

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Continuity</h3>
          <p className="text-xs text-stone-500">Deterministic story consistency checks</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchReport}
          title="Re-run checks"
          className="h-7 w-7"
        >
          <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 pb-4">
        {loading && !report ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : findings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ShieldCheck className="h-8 w-8 text-emerald-400 mb-2" />
            <p className="text-sm font-medium">No continuity issues found</p>
            <p className="text-xs text-stone-500 mt-1">
              {report
                ? `Checked ${report.stats?.scenes ?? 0} scenes across ${report.stats?.characters ?? 0} characters, ${report.stats?.locations ?? 0} locations, ${report.stats?.timelineEvents ?? 0} timeline events.`
                : 'Nothing to check yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2 text-xs">
              <Badge className="bg-red-500/15 text-red-400 border-red-500/30">{errors.length} errors</Badge>
              <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30">{warnings.length} warnings</Badge>
              <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30">{infos.length} notes</Badge>
            </div>

            {findings.map((f) => {
              const Icon = SEVERITY_ICON[f.severity]
              return (
                <div
                  key={f.id}
                  className="rounded-lg border border-writer-border bg-writer-surface/60 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 mt-0.5 text-stone-400 shrink-0" />
                      <p className="text-sm leading-snug">{f.problem}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] px-1.5 py-0 ${SEVERITY_STYLE[f.severity]}`}
                    >
                      {(f.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-500 font-mono break-words">{f.evidence}</p>
                  {f.affected.length > 0 && (
                    <p className="text-[11px] text-stone-500">
                      Affected: {f.affected.join(', ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
