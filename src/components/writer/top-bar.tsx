'use client'

import React, { useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  Maximize2,
  Minimize2,
  Type,
  Search,
  Sun,
  Moon,
  Settings,
  BookOpen,
  ChevronRight,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface TopBarProps {
  totalWordCount?: number
  chapterTitle?: string
  sceneTitle?: string
}

export function TopBar({ totalWordCount = 0, chapterTitle, sceneTitle }: TopBarProps) {
  const {
    currentProjectName,
    currentProjectId,
    editorWordCount,
    isFocusMode,
    isTypewriterMode,
    setFocusMode,
    setTypewriterMode,
    setSearchOpen,
  } = useWriterStore()

  const { theme, setTheme } = useTheme()
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(currentProjectName)

  const handleNameSave = async () => {
    if (!currentProjectId || !nameValue.trim()) {
      setNameValue(currentProjectName)
      setIsEditingName(false)
      return
    }
    try {
      await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue.trim() }),
      })
    } catch (err) {
      console.error('Failed to rename project:', err)
    }
    setIsEditingName(false)
  }

  return (
    <header className="flex items-center h-11 px-3 gap-2 border-b border-writer-border bg-writer-surface/60 backdrop-blur-sm select-none">
      {/* Project Name */}
      <div className="flex items-center gap-2 min-w-0">
        <BookOpen className="h-4 w-4 shrink-0 text-writer-accent" />
        {isEditingName ? (
          <Input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave()
              if (e.key === 'Escape') {
                setNameValue(currentProjectName)
                setIsEditingName(false)
              }
            }}
            className="h-6 text-sm w-48 px-1"
            autoFocus
          />
        ) : (
          <button
            onDoubleClick={() => {
              setNameValue(currentProjectName)
              setIsEditingName(true)
            }}
            className="text-sm font-medium truncate hover:text-writer-accent transition-colors cursor-default"
          >
            {currentProjectName || 'Untitled'}
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      {(chapterTitle || sceneTitle) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ChevronRight className="h-3 w-3" />
          {chapterTitle && <span className="truncate max-w-32">{chapterTitle}</span>}
          {sceneTitle && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="truncate max-w-40">{sceneTitle}</span>
            </>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Word Count */}
      <Badge variant="secondary" className="text-xs font-normal gap-1.5 h-6">
        <span className="tabular-nums">{editorWordCount.toLocaleString()}</span>
        <span className="text-muted-foreground">words</span>
      </Badge>

      {totalWordCount > 0 && (
        <Badge variant="outline" className="text-xs font-normal gap-1.5 h-6">
          <span className="tabular-nums">{totalWordCount.toLocaleString()}</span>
          <span className="text-muted-foreground">total</span>
        </Badge>
      )}

      <Separator orientation="vertical" className="h-5" />

      {/* Mode Toggles */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', isTypewriterMode && 'text-writer-accent')}
            onClick={() => setTypewriterMode(!isTypewriterMode)}
          >
            <Type className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Typewriter Mode</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', isFocusMode && 'text-writer-accent')}
            onClick={() => setFocusMode(!isFocusMode)}
          >
            {isFocusMode ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Focus Mode</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5" />

      {/* Search */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Search (Ctrl+K)</TooltipContent>
      </Tooltip>

      {/* Theme Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Toggle Theme</TooltipContent>
      </Tooltip>

      {/* Settings */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Settings</TooltipContent>
      </Tooltip>
    </header>
  )
}
