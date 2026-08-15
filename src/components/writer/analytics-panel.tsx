'use client'

import { useMemo, useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useDataStore } from '@/store/data-store'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  Target,
  Flame,
  PenLine,
  BarChart3,
  Clock,
  Zap,
} from 'lucide-react'
import { SprintPanel } from './sprint-panel'
import { GoalsPanel } from './goals-panel'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function AnalyticsPanel() {
  const { currentProjectId, setSprintPanelOpen } = useWriterStore()
  const store = useDataStore()
  const [activeTab, setActiveTab] = useState('goals')

  // ─── Derived data from store ─────────────────

  const { goals, sessions, totalWords, chapterStats } = useMemo(() => {
    if (!currentProjectId) {
      return { goals: [], sessions: [], totalWords: 0, chapterStats: { draft: 0, writing: 0, revision: 0, final: 0 } }
    }

    const goals = store.getGoalsByProject(currentProjectId)
    const sessions = store.getSessionsByProject(currentProjectId)
    const totalWords = store.getProjectWordCount(currentProjectId)

    const chapters = store.getChaptersByProject(currentProjectId)
    const stats = { draft: 0, writing: 0, revision: 0, final: 0 }
    for (const ch of chapters) {
      // Data-store chapters don't have a status field, so count all as draft
      stats.draft++
    }

    return { goals, sessions, totalWords, chapterStats: stats }
  }, [store, currentProjectId])

  // Calculate streak
  const calculateStreak = (): number => {
    if (sessions.length === 0) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let streakCount = 0
    let checkDate = new Date(today)

    const sessionDates = new Set(sessions.map((s) => s.date.split('T')[0]))

    while (sessionDates.has(checkDate.toISOString().split('T')[0])) {
      streakCount++
      checkDate.setDate(checkDate.getDate() - 1)
    }
    return streakCount
  }

  const todayWords = (() => {
    const today = new Date().toISOString().split('T')[0]
    return sessions
      .filter((s) => s.date.split('T')[0] === today)
      .reduce((sum, s) => sum + s.wordsWritten, 0)
  })()

  const streak = calculateStreak()
  const activeGoals = goals.filter((g) => g.active)

  // Calculate last 7 days data for bar chart
  const last7Days = (() => {
    const days = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayWords = sessions
        .filter((s) => s.date.split('T')[0] === dateStr)
        .reduce((sum, s) => sum + s.wordsWritten, 0)
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        words: dayWords,
      })
    }
    return days
  })()

  const maxDayWords = Math.max(...last7Days.map((d) => d.words), 1)

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 mb-1 w-auto flex-wrap h-auto gap-0.5">
          <TabsTrigger value="overview" className="text-[10px] gap-1 px-2 py-1">
            <BarChart3 className="size-3" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-[10px] gap-1 px-2 py-1">
            <Target className="size-3" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="sprint" className="text-[10px] gap-1 px-2 py-1">
            <Zap className="size-3" />
            Sprint
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="overview" className="mt-0 h-full">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Sprint Quick Start */}
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  size="sm"
                  onClick={() => setActiveTab('sprint')}
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Start a Sprint
                </Button>

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

                {/* 7-Day Writing History Bar Chart */}
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                    Last 7 Days
                  </h3>
                  <div className="flex items-end gap-1.5 h-24">
                    {last7Days.map((day) => {
                      const heightPct = maxDayWords > 0 ? (day.words / maxDayWords) * 100 : 0
                      const isToday = day.date === new Date().toISOString().split('T')[0]
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-stone-400 tabular-nums">
                            {day.words > 0 ? day.words : ''}
                          </span>
                          <div className="w-full flex-1 flex items-end">
                            <div
                              className={`w-full rounded-t-sm transition-all duration-300 ${
                                isToday
                                  ? 'bg-amber-500'
                                  : day.words > 0
                                    ? 'bg-stone-300 dark:bg-stone-600'
                                    : 'bg-stone-100 dark:bg-stone-800'
                              }`}
                              style={{ height: `${Math.max(heightPct, day.words > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                          <span className={`text-[9px] ${isToday ? 'text-amber-600 font-medium' : 'text-stone-400'}`}>
                            {day.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
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
                            <span className="text-xs text-stone-600 dark:text-stone-300">{formatDate(session.date.split('T')[0])}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-stone-900 dark:text-stone-100">
                              {session.wordsWritten.toLocaleString()} words
                            </span>
                            {session.duration > 0 && (
                              <span className="text-[10px] text-stone-400">
                                {Math.floor(session.duration / 60)}m
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="goals" className="mt-0 h-full">
            <GoalsPanel />
          </TabsContent>

          <TabsContent value="sprint" className="mt-0 h-full">
            <ScrollArea className="h-full">
              <SprintPanel />
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
