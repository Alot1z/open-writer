'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  ChevronUp,
  ChevronDown,
  PenLine,
  Clock,
  Flame,
  Timer,
  Focus,
  Minimize2,
} from 'lucide-react'

interface SessionData {
  id: string
  wordsWritten: number
  duration: number
  date: string
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function FlowWidget() {
  const {
    editorWordCount,
    currentProjectId,
    sprint,
    isFocusMode,
    setFocusMode,
    setSprintPanelOpen,
  } = useWriterStore()

  const [expanded, setExpanded] = useState(true)
  const [todayWords, setTodayWords] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [sessions, setSessions] = useState<SessionData[]>([])

  // Track session duration (time since page load for writing)
  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch sessions data
  const fetchSessions = useCallback(async () => {
    if (!currentProjectId) return
    try {
      const res = await fetch(`/api/sessions?projectId=${currentProjectId}`)
      if (res.ok) {
        const data: SessionData[] = await res.json()
        setSessions(data)

        // Calculate today's words
        const today = new Date().toISOString().split('T')[0]
        const todayTotal = data
          .filter((s) => s.date === today)
          .reduce((sum, s) => sum + s.wordsWritten, 0)
        setTodayWords(todayTotal)

        // Calculate streak
        const sessionDates = new Set(data.map((s) => s.date))
        const todayDate = new Date()
        todayDate.setHours(0, 0, 0, 0)
        let currentStreak = 0
        let checkDate = new Date(todayDate)

        while (sessionDates.has(checkDate.toISOString().split('T')[0])) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        }
        setStreak(currentStreak)
      }
    } catch {
      // silent
    }
  }, [currentProjectId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSessions()
    const interval = setInterval(fetchSessions, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [fetchSessions])

  // Don't show in focus mode (it would obstruct)
  if (isFocusMode) return null

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md shadow-lg overflow-hidden"
          style={{ minWidth: expanded ? 200 : 44 }}
        >
          {expanded ? (
            <div className="p-3 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Flow</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setExpanded(false)}
                >
                  <Minimize2 className="h-3 w-3 text-stone-400" />
                </Button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-1.5 rounded-md bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    {todayWords.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-stone-400">today</p>
                </div>
                <div className="text-center p-1.5 rounded-md bg-stone-50 dark:bg-stone-800/50">
                  <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                    {formatDuration(sessionDuration)}
                  </p>
                  <p className="text-[9px] text-stone-400">session</p>
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span className="text-[10px] text-stone-500">
                    {streak} day{streak !== 1 ? 's' : ''} streak
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <PenLine className="h-3 w-3 text-stone-400" />
                  <span className="text-[10px] text-stone-500">
                    {editorWordCount} words
                  </span>
                </div>
              </div>

              {/* Active Sprint */}
              {sprint.status === 'running' && (
                <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-amber-100/50 dark:bg-amber-900/30">
                  <div className="flex items-center gap-1.5">
                    <Timer className="h-3 w-3 text-amber-600" />
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">Sprint</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                    {sprint.type === 'time'
                      ? formatTimeShort(Math.max(0, sprint.targetDuration - sprint.elapsedSeconds))
                      : `${sprint.wordsWritten}/${sprint.targetWords}`
                    }
                  </span>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-[10px] h-6 gap-1"
                  onClick={() => setSprintPanelOpen(true)}
                >
                  <Zap className="h-3 w-3" />
                  Sprint
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-[10px] h-6 gap-1"
                  onClick={() => setFocusMode(!isFocusMode)}
                >
                  <Focus className="h-3 w-3" />
                  Focus
                </Button>
              </div>
            </div>
          ) : (
            /* Collapsed state - just an icon */
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center justify-center w-11 h-11 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <Flame className="h-5 w-5 text-amber-500" />
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
