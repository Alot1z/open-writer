'use client'

import React from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useDataStore } from '@/store/data-store'
import { cn } from '@/lib/utils'

interface StatusBarProps {
  saveStatus?: 'saved' | 'saving' | 'unsaved'
  totalWordCount?: number
  className?: string
}

export function StatusBar({ saveStatus = 'saved', totalWordCount = 0, className }: StatusBarProps) {
  const {
    currentProjectName,
    currentChapterId,
    currentSceneId,
    editorWordCount,
    editorCharacterCount,
    isFocusMode,
    isTypewriterMode,
  } = useWriterStore()

  const store = useDataStore()

  // Derive titles directly from data store — reactive, no fetch needed
  const chapterTitle = currentChapterId ? (store.getChapter(currentChapterId)?.title ?? '') : ''
  const sceneTitle = currentSceneId ? (store.getScene(currentSceneId)?.title ?? '') : ''

  const statusColors = {
    saved: 'text-emerald-600 dark:text-emerald-400',
    saving: 'text-amber-600 dark:text-amber-400',
    unsaved: 'text-orange-600 dark:text-orange-400',
  }

  const statusLabels = {
    saved: 'Saved',
    saving: 'Saving...',
    unsaved: 'Unsaved',
  }

  return (
    <footer
      className={cn(
        'flex items-center h-7 px-3 text-[11px] text-muted-foreground border-t border-writer-border bg-writer-surface/60 select-none gap-4',
        className
      )}
    >
      {/* Project */}
      {currentProjectName && (
        <span className="truncate max-w-40">{currentProjectName}</span>
      )}

      {/* Location */}
      {(chapterTitle || sceneTitle) && (
        <span className="truncate">
          {chapterTitle}
          {sceneTitle && ` › ${sceneTitle}`}
        </span>
      )}

      <div className="flex-1" />

      {/* Scene word count */}
      {currentSceneId && (
        <span className="tabular-nums">
          {editorWordCount.toLocaleString()} words · {editorCharacterCount.toLocaleString()} chars
        </span>
      )}

      {/* Total */}
      {totalWordCount > 0 && (
        <span className="tabular-nums">
          Total: {totalWordCount.toLocaleString()}
        </span>
      )}

      {/* Save status */}
      {currentSceneId && (
        <span className={cn('flex items-center gap-1', statusColors[saveStatus])}>
          <span
            className={cn(
              'inline-block w-1.5 h-1.5 rounded-full',
              saveStatus === 'saved' && 'bg-emerald-500',
              saveStatus === 'saving' && 'bg-amber-500 animate-pulse',
              saveStatus === 'unsaved' && 'bg-orange-500',
            )}
          />
          {statusLabels[saveStatus]}
        </span>
      )}

      {/* Mode indicators */}
      {/* Open Writer badge */}
      <span className="text-amber-600/60 dark:text-amber-400/60 font-medium">OW</span>

      {isFocusMode && (
        <span className="text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-1.5 rounded">Focus</span>
      )}
      {isTypewriterMode && (
        <span className="text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-1.5 rounded">Typewriter</span>
      )}
    </footer>
  )
}
