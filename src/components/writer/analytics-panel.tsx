'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  BookOpen,
  Target,
  Flame,
  PenLine,
  BarChart3,
  Clock,
} from 'lucide-react'

interface Goal {
  id: string
  type: string
  target: number
  current: number
  deadline: string
  active: boolean
}

interface Session {
  id: string
  wordsWritten: number
  duration: number
  date: string
}

interface ChapterStats {
  draft: number
  writing: number
  revision: number
  final: number
}

export function AnalyticsPanel() {
  const { currentProjectId } = useWriterStore()
  const [goals, setGoals] = useState<Goal[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [chapterStats, setChapterStats] = useState<ChapterStats>({ draft: 0, writing: 0, revision: 0, final: 0 })
  const [totalWords, setTotalWords] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      // Fetch goals
      const goalsRes = await fetch(`/api/goals?projectId=${currentProjectId}`)
      if (goalsRes.ok) {
        const goalsData = await goalsRes.json()
        setGoals(goalsData)
      }

      // Fetch sessions & chapters
      const [sessionsRes, chaptersRes] = await Promise.all([
        fetch(`/api/goals?projectId=${currentProjectId}`),
        fetch(`/api/chapters?projectId=${currentProjectId}`),
      ])

      if (sessionsRes.ok) {
        // Reuse goals as session data source for now
      }

      if (chaptersRes.ok) {
        const chapters = await chaptersRes.json()
        const stats: ChapterStats = { draft: 0, writing: 0, revision: 0, final: 0 }
        let words = 0
        for (const ch of chapters) {
          const status = ch.status || 'draft'
          if (status in stats) {
            stats[status as keyof ChapterStats]++
          } else {
            stats.draft++
          }
          // Count words from scenes
          if (ch.scenes) {
            for (const scene of ch.scenes) {
              words += scene.wordCount || 0
            }
          }
        }
        setChapterStats(stats)
        setTotalWords(words)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate streak
  const calculateStreak = (): number => {
    if (sessions.length === 0) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let streak = 0
    let checkDate = new Date(today)

    const sessionDates = new Set(sessions.map((s) => s.date))

    while (sessionDates.has(checkDate.toISOString().split('T')[0])) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }
    return streak
  }

  const todayWords = (() => {
    const today = new Date().toISOString().split('T')[0]
    return sessions
      .filter((s) => s.date === today)
      .reduce((sum, s) => sum + s.wordsWritten, 0)
  })()

  const streak = calculateStreak()
  const activeGoals = goals.filter((g) => g.active)

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-stone-500" />
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Analytics</h2>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-stone-200 dark:border-stone-700">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[10px] text-stone-500">Total Words</span>
              </div>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {totalWords.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-stone-200 dark:border-stone-700">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <PenLine className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[10px] text-stone-500">Today</span>
              </div>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {todayWords.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-stone-200 dark:border-stone-700">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-[10px] text-stone-500">Streak</span>
              </div>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {streak} day{streak !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="border-stone-200 dark:border-stone-700">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[10px] text-stone-500">Active Goals</span>
              </div>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {activeGoals.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Goal Progress */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wider">
            Goal Progress
          </h3>
          {activeGoals.length === 0 ? (
            <p className="text-xs text-stone-400">No active goals</p>
          ) : (
            activeGoals.map((goal) => {
              const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0
              return (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                      {goal.type}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )
            })
          )}
        </div>

        <Separator />

        {/* Chapter Status */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wider">
            Chapter Status
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs gap-1.5">
              <span className="h-2 w-2 rounded-full bg-stone-400" />
              Draft: {chapterStats.draft}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Writing: {chapterStats.writing}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Revision: {chapterStats.revision}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-400" />
              Final: {chapterStats.final}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Recent Sessions */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wider">
            Recent Sessions
          </h3>
          {sessions.length === 0 ? (
            <p className="text-xs text-stone-400">No writing sessions recorded</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded-md bg-stone-50 dark:bg-stone-800/50"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    <span className="text-xs text-stone-600 dark:text-stone-300">{session.date}</span>
                  </div>
                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100">
                    {session.wordsWritten.toLocaleString()} words
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
