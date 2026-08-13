'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useWriterStore, SprintType } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Square,
  Timer,
  PenLine,
  Trophy,
  RotateCcw,
  Zap,
  Save,
  PartyPopper,
} from 'lucide-react'

const TIME_PRESETS = [
  { label: '15 min', value: 15 },
  { label: '25 min', value: 25 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function SprintPanel() {
  const {
    sprint,
    editorWordCount,
    currentProjectId,
    startSprint,
    pauseSprint,
    resumeSprint,
    stopSprint,
    tickSprint,
    updateSprintWords,
  } = useWriterStore()

  const [sprintType, setSprintType] = useState<SprintType>('time')
  const [duration, setDuration] = useState(25)
  const [wordGoal, setWordGoal] = useState(500)
  const [customDuration, setCustomDuration] = useState('')
  const [saved, setSaved] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevWordCountRef = useRef(editorWordCount)

  // Tick the sprint timer every second
  useEffect(() => {
    if (sprint.status === 'running') {
      timerRef.current = setInterval(() => {
        tickSprint()
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [sprint.status, tickSprint])

  // Track word count changes during sprint
  useEffect(() => {
    if (sprint.status === 'running' && editorWordCount !== prevWordCountRef.current) {
      updateSprintWords(editorWordCount)
      prevWordCountRef.current = editorWordCount
    }
  }, [editorWordCount, sprint.status, updateSprintWords])

  // Calculate current WPM
  const currentWPM = sprint.elapsedSeconds > 0
    ? Math.round((sprint.wordsWritten / sprint.elapsedSeconds) * 60)
    : 0

  // Calculate progress
  const progress = sprint.type === 'time'
    ? (sprint.elapsedSeconds / sprint.targetDuration) * 100
    : sprint.targetWords > 0
      ? (sprint.wordsWritten / sprint.targetWords) * 100
      : 0

  const clampedProgress = Math.min(progress, 100)

  // Time remaining for time sprints
  const timeRemaining = sprint.type === 'time'
    ? Math.max(0, sprint.targetDuration - sprint.elapsedSeconds)
    : 0

  // Save session to API
  const handleSaveSession = async () => {
    if (!currentProjectId) return
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          wordsWritten: sprint.wordsWritten,
          duration: sprint.elapsedSeconds,
          date: new Date().toISOString().split('T')[0],
          metadata: JSON.stringify({
            type: sprint.type,
            targetDuration: sprint.targetDuration,
            targetWords: sprint.targetWords,
            wpm: currentWPM,
          }),
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // silent
    }
  }

  const handleStart = () => {
    const target = sprintType === 'time' ? duration : wordGoal
    startSprint(sprintType, target, editorWordCount)
    prevWordCountRef.current = editorWordCount
  }

  // Idle state - configuration
  if (sprint.status === 'idle') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Writing Sprint</h2>
        </div>

        {/* Sprint Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-stone-600 dark:text-stone-400">Sprint Type</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={sprintType === 'time' ? 'default' : 'outline'}
              size="sm"
              className={sprintType === 'time' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
              onClick={() => setSprintType('time')}
            >
              <Timer className="h-3.5 w-3.5 mr-1.5" />
              Time
            </Button>
            <Button
              variant={sprintType === 'words' ? 'default' : 'outline'}
              size="sm"
              className={sprintType === 'words' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
              onClick={() => setSprintType('words')}
            >
              <PenLine className="h-3.5 w-3.5 mr-1.5" />
              Words
            </Button>
          </div>
        </div>

        {/* Duration Selection (for time sprints) */}
        {sprintType === 'time' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400">Duration</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TIME_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={duration === preset.value ? 'default' : 'outline'}
                  size="sm"
                  className={`text-xs h-8 ${duration === preset.value ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                  onClick={() => setDuration(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  const val = parseInt(customDuration)
                  if (val > 0 && val <= 120) setDuration(val)
                }}
              >
                Custom
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={120}
                placeholder="Custom minutes"
                value={customDuration}
                onChange={(e) => {
                  setCustomDuration(e.target.value)
                  const val = parseInt(e.target.value)
                  if (val > 0 && val <= 120) setDuration(val)
                }}
                className="text-xs h-8"
              />
              <span className="text-xs text-stone-400">min</span>
            </div>
          </div>
        )}

        {/* Word Goal Input (for word sprints) */}
        {sprintType === 'words' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400">Word Goal</label>
            <Input
              type="number"
              min={10}
              max={10000}
              value={wordGoal}
              onChange={(e) => setWordGoal(Math.max(10, parseInt(e.target.value) || 10))}
              className="text-xs"
            />
          </div>
        )}

        <Separator />

        {/* Start Button */}
        <Button
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          onClick={handleStart}
        >
          <Play className="h-4 w-4 mr-2" />
          Start Sprint
        </Button>

        <p className="text-[10px] text-stone-400 text-center">
          {sprintType === 'time'
            ? `Write for ${duration} minutes. Focus and let the words flow.`
            : `Sprint to ${wordGoal} words. Race to your target!`
          }
        </p>
      </div>
    )
  }

  // Completed state - results
  if (sprint.status === 'completed') {
    return (
      <div className="p-4 space-y-4">
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <PartyPopper className="h-10 w-10 mx-auto text-amber-500 mb-3" />
            </motion.div>
            <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400">
              Sprint Complete!
            </h2>
          </motion.div>
        </AnimatePresence>

        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-500">Words Written</span>
              <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {sprint.wordsWritten}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-500">Duration</span>
              <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {formatTime(sprint.elapsedSeconds)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-500">WPM</span>
              <span className="text-lg font-bold text-amber-600">
                {currentWPM}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={handleSaveSession}
            disabled={saved}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saved ? 'Saved!' : 'Save Session'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={stopSprint}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            New Sprint
          </Button>
        </div>
      </div>
    )
  }

  // Running / Paused state
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            {sprint.status === 'paused' ? 'Sprint Paused' : 'Sprinting...'}
          </h2>
        </div>
        <Badge
          variant={sprint.status === 'running' ? 'default' : 'secondary'}
          className={`text-[10px] ${sprint.status === 'running' ? 'bg-amber-600 text-white' : ''}`}
        >
          {sprint.type === 'time' ? 'Time' : 'Words'}
        </Badge>
      </div>

      {/* Timer Display */}
      <div className="text-center py-4">
        <motion.div
          key={sprint.status}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="font-mono text-5xl font-bold text-amber-700 dark:text-amber-400 tabular-nums"
        >
          {sprint.type === 'time'
            ? formatTime(timeRemaining)
            : `${Math.max(0, sprint.targetWords - sprint.wordsWritten)}`
          }
        </motion.div>
        <p className="text-xs text-stone-400 mt-2">
          {sprint.type === 'time' ? 'remaining' : 'words to go'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-stone-500">
          <span>Progress</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
        <Progress value={clampedProgress} className="h-2" />
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-md bg-stone-50 dark:bg-stone-800/50">
          <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {sprint.wordsWritten}
          </p>
          <p className="text-[10px] text-stone-400">words</p>
        </div>
        <div className="text-center p-2 rounded-md bg-stone-50 dark:bg-stone-800/50">
          <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {currentWPM}
          </p>
          <p className="text-[10px] text-stone-400">WPM</p>
        </div>
        <div className="text-center p-2 rounded-md bg-stone-50 dark:bg-stone-800/50">
          <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {formatTime(sprint.elapsedSeconds)}
          </p>
          <p className="text-[10px] text-stone-400">elapsed</p>
        </div>
      </div>

      <Separator />

      {/* Controls */}
      <div className="flex gap-2">
        {sprint.status === 'running' ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={pauseSprint}
          >
            <Pause className="h-3.5 w-3.5 mr-1.5" />
            Pause
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            onClick={resumeSprint}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Resume
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-stone-400 hover:text-red-500"
          onClick={stopSprint}
        >
          <Square className="h-3.5 w-3.5 mr-1.5" />
          Stop
        </Button>
      </div>
    </div>
  )
}
