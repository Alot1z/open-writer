'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { RichTextEditor } from './rich-text-editor'
import { motion } from 'framer-motion'
import { PenLine, FileText } from 'lucide-react'
import { loadWritingSettings } from '@/lib/settings'

interface SceneData {
  id: string
  title: string
  content: string
  wordCount: number
}

interface EditorAreaProps {
  className?: string
}

export function EditorArea({ className }: EditorAreaProps) {
  const {
    currentSceneId,
    currentChapterId,
    isFocusMode,
    isTypewriterMode,
    setEditorStats,
  } = useWriterStore()

  const [sceneData, setSceneData] = useState<SceneData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const lastSavedContent = useRef<string>('')
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Latest unsaved content, so flush-on-close saves the newest keystrokes
  const pendingContent = useRef<{ sceneId: string; content: string } | null>(null)

  // Stable save function (uses refs, safe to call from unmount/pagehide handlers)
  const saveScene = useCallback(async (sceneId: string, content: string) => {
    try {
      setSaveStatus('saving')
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        lastSavedContent.current = content
        setSaveStatus('saved')
        return true
      }
    } catch (err) {
      console.error('Failed to save scene:', err)
    }
    setSaveStatus('unsaved')
    return false
  }, [])

  // Flush any pending autosave immediately (no-op when nothing is unsaved)
  const flushSave = useCallback(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }
    const pending = pendingContent.current
    pendingContent.current = null
    if (!pending) return
    if (pending.content === lastSavedContent.current) return
    void saveScene(pending.sceneId, pending.content)
  }, [saveScene])

  // Fetch scene data when scene changes
  useEffect(() => {
    if (!currentSceneId) {
      setSceneData(null)
      return
    }

    // Flush the previous scene's unsaved content before switching
    flushSave()

    const fetchScene = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/scenes/${currentSceneId}`)
        if (res.ok) {
          const data = await res.json()
          setSceneData(data)
          lastSavedContent.current = data.content
          setSaveStatus('saved')
          setEditorStats(data.wordCount, data.content?.length || 0)
        }
      } catch (err) {
        console.error('Failed to fetch scene:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchScene()
  }, [currentSceneId, setEditorStats, flushSave])

  // Flush pending autosave on unmount and on page close / tab hide
  useEffect(() => {
    const flushOnHidden = () => {
      if (document.visibilityState === 'hidden') flushSave()
    }
    document.addEventListener('visibilitychange', flushOnHidden)
    window.addEventListener('pagehide', flushSave)
    return () => {
      document.removeEventListener('visibilitychange', flushOnHidden)
      window.removeEventListener('pagehide', flushSave)
      flushSave()
    }
  }, [flushSave])

  // Ctrl/Cmd+S: save immediately (never let the browser open its save dialog)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        flushSave()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [flushSave])

  // Autosave handler
  const handleContentChange = useCallback(
    (html: string) => {
      if (!currentSceneId) return

      // Update local state immediately
      setSceneData((prev) => prev ? { ...prev, content: html } : null)
      setSaveStatus('unsaved')

      // Remember latest content so flush-on-close saves it
      pendingContent.current = { sceneId: currentSceneId, content: html }

      // Clear previous timer
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)

      // Debounced autosave (interval from Writing settings)
      const intervalMs = Math.max(0.5, loadWritingSettings().autosaveInterval) * 1000
      autosaveTimer.current = setTimeout(() => {
        flushSave()
      }, intervalMs)
    },
    [currentSceneId, flushSave]
  )

  // Word count change handler
  const handleWordCountChange = useCallback(
    (words: number, chars: number) => {
      setEditorStats(words, chars)
    },
    [setEditorStats]
  )

  // Focus mode wrapper
  if (isFocusMode) {
    return (
      <div className={className}>
        {currentSceneId && sceneData ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full"
            style={{
              fontFamily: "'Georgia', 'Merriweather', serif",
            }}
          >
            <RichTextEditor
              content={sceneData.content}
              onChange={handleContentChange}
              onWordCountChange={handleWordCountChange}
              placeholder="Start writing..."
              typewriterMode={isTypewriterMode}
            />
          </motion.div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <PenLine className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg" style={{ fontFamily: "'Georgia', 'Merriweather', serif" }}>
                Select a scene to begin writing
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Normal mode
  if (!currentSceneId) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-writer-bg">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-md px-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-writer-accent-soft mb-4">
              <PenLine className="h-8 w-8 text-writer-accent/60" />
            </div>
            <h2
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: "'Georgia', 'Merriweather', serif" }}
            >
              {currentChapterId ? 'Select a scene to write' : 'Welcome to your manuscript'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentChapterId
                ? 'Choose a scene from the chapter tree, or create a new one.'
                : 'Select a chapter and scene from the sidebar to start writing.'}
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-writer-bg">
          <div className="animate-pulse space-y-3 max-w-3xl w-full px-8">
            <div className="h-6 bg-muted/30 rounded w-1/3" />
            <div className="h-4 bg-muted/30 rounded w-full" />
            <div className="h-4 bg-muted/30 rounded w-5/6" />
            <div className="h-4 bg-muted/30 rounded w-4/5" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {sceneData && (
        <div
          className="h-full bg-writer-bg"
          style={{
            fontFamily: "'Georgia', 'Merriweather', serif",
          }}
        >
          <RichTextEditor
            content={sceneData.content}
            onChange={handleContentChange}
            onWordCountChange={handleWordCountChange}
            placeholder="Start writing..."
            typewriterMode={isTypewriterMode}
          />
        </div>
      )}
    </div>
  )
}
