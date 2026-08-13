'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Target,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  BookOpen,
  Edit3,
  Check,
  X,
} from 'lucide-react'

interface Goal {
  id: string
  type: string
  target: number
  current: number
  deadline: string
  active: boolean
}

const GOAL_TYPES = [
  { value: 'daily_words', label: 'Daily Words', icon: '📝' },
  { value: 'total_words', label: 'Total Words', icon: '📖' },
  { value: 'chapter_count', label: 'Chapter Count', icon: '📑' },
  { value: 'deadline', label: 'Deadline', icon: '📅' },
  { value: 'session_time', label: 'Session Time', icon: '⏱️' },
]

function getGoalTypeLabel(type: string): string {
  return GOAL_TYPES.find((t) => t.value === type)?.label ?? type
}

function getGoalTypeIcon(type: string): string {
  return GOAL_TYPES.find((t) => t.value === type)?.icon ?? '🎯'
}

function getProgressColor(progress: number, deadline: string): string {
  if (deadline) {
    const now = new Date()
    const dl = new Date(deadline)
    const daysLeft = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return 'bg-red-500' // missed
    if (progress >= 100) return 'bg-emerald-500' // completed
    const expectedProgress = Math.max(0, 100 - (daysLeft / 30) * 100)
    if (progress < expectedProgress * 0.7) return 'bg-red-500' // behind
    if (progress < expectedProgress) return 'bg-amber-500' // slightly behind
    return 'bg-emerald-500' // on track
  }
  if (progress >= 100) return 'bg-emerald-500'
  if (progress >= 60) return 'bg-amber-500'
  return 'bg-amber-600'
}

export function GoalsPanel() {
  const { currentProjectId } = useWriterStore()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Create form state
  const [newType, setNewType] = useState('daily_words')
  const [newTarget, setNewTarget] = useState(1000)
  const [newDeadline, setNewDeadline] = useState('')

  // Edit form state
  const [editTarget, setEditTarget] = useState(0)

  const fetchGoals = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/goals?projectId=${currentProjectId}`)
      if (res.ok) {
        const data = await res.json()
        setGoals(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleCreateGoal = async () => {
    if (!currentProjectId || newTarget <= 0) return
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          type: newType,
          target: newTarget,
          deadline: newDeadline,
          active: true,
        }),
      })
      if (res.ok) {
        await fetchGoals()
        setShowCreate(false)
        setNewTarget(1000)
        setNewDeadline('')
      }
    } catch {
      // silent
    }
  }

  const handleToggleActive = async (goal: Goal) => {
    try {
      // Create a new goal with toggled active state (the API updates existing)
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          type: goal.type,
          active: !goal.active,
        }),
      })
      await fetchGoals()
    } catch {
      // silent
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await fetch(`/api/goals/${goalId}`, { method: 'DELETE' })
      await fetchGoals()
    } catch {
      // silent
    }
  }

  const handleStartEdit = (goal: Goal) => {
    setEditingId(goal.id)
    setEditTarget(goal.target)
  }

  const handleSaveEdit = async (goal: Goal) => {
    try {
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          type: goal.type,
          target: editTarget,
        }),
      })
      await fetchGoals()
      setEditingId(null)
    } catch {
      // silent
    }
  }

  const activeGoals = goals.filter((g) => g.active)
  const inactiveGoals = goals.filter((g) => !g.active)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Goals</h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus className="h-3 w-3 mr-1" />
            New Goal
          </Button>
        </div>

        {/* Create Goal Form */}
        {showCreate && (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="p-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-600 dark:text-stone-400">Goal Type</label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
                  Target {newType === 'session_time' ? '(minutes)' : newType === 'chapter_count' ? '(chapters)' : '(words)'}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={newTarget}
                  onChange={(e) => setNewTarget(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-xs h-8"
                />
              </div>

              {newType === 'deadline' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-400">Deadline</label>
                  <Input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 text-white h-7"
                  onClick={handleCreateGoal}
                >
                  Create Goal
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Goals */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wider">
            Active Goals
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-stone-100 dark:bg-stone-800 rounded-md animate-pulse" />
              ))}
            </div>
          ) : activeGoals.length === 0 ? (
            <p className="text-xs text-stone-400 py-2">No active goals. Create one to track your progress!</p>
          ) : (
            activeGoals.map((goal) => {
              const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0
              const colorClass = getProgressColor(progress, goal.deadline)
              const isEditing = editingId === goal.id

              return (
                <div
                  key={goal.id}
                  className="p-3 rounded-md border border-stone-200 dark:border-stone-700 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{getGoalTypeIcon(goal.type)}</span>
                      <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        {getGoalTypeLabel(goal.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            value={editTarget}
                            onChange={(e) => setEditTarget(parseInt(e.target.value) || 0)}
                            className="text-xs h-6 w-20"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleSaveEdit(goal)}
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3 w-3 text-stone-400" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleStartEdit(goal)}
                          >
                            <Edit3 className="h-3 w-3 text-stone-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleToggleActive(goal)}
                          >
                            <ToggleRight className="h-3 w-3 text-amber-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <Trash2 className="h-3 w-3 text-stone-400 hover:text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500">
                        {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
                      </span>
                      <span className={`font-medium ${progress >= 100 ? 'text-emerald-600' : 'text-stone-500'}`}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {goal.deadline && (
                    <div className="flex items-center gap-1 text-[10px] text-stone-400">
                      <Calendar className="h-3 w-3" />
                      <span>Deadline: {goal.deadline}</span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Inactive Goals */}
        {inactiveGoals.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                Inactive
              </h3>
              {inactiveGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between p-2 rounded-md bg-stone-50 dark:bg-stone-800/50"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs opacity-50">{getGoalTypeIcon(goal.type)}</span>
                    <span className="text-xs text-stone-400 line-through">
                      {getGoalTypeLabel(goal.type)}: {goal.target.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleToggleActive(goal)}
                    >
                      <ToggleLeft className="h-3 w-3 text-stone-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 className="h-3 w-3 text-stone-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  )
}
