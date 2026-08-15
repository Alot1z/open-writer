'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useWriterStore } from '@/store/writer-store'
import { useDataStore } from '@/store/data-store'
import { RichTextEditor } from './rich-text-editor'
import { motion } from 'framer-motion'
import { PenLine } from 'lucide-react'

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

  const store = useDataStore()

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get scene data directly from the data store
  const sceneData = currentSceneId ? store.getScene(currentSceneId) : null

  // Reset save status when scene changes
  const [prevSceneId, setPrevSceneId] = useState<string | null>(null)
  if (currentSceneId !== prevSceneId) {
    setPrevSceneId(currentSceneId)
    setSaveStatus('saved')
  }

  // Update editor stats when scene data is available
  const wordCount = sceneData?.wordCount ?? 0
  const charCount = sceneData?.content?.length ?? 0

  // Cleanup autosave timer
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [])

  // Autosave handler
  const handleContentChange = useCallback(
    (html: string) => {
      if (!currentSceneId) return

      setSaveStatus('unsaved')

      // Clear previous timer
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)

      // Debounced autosave (1.5 seconds)
      autosaveTimer.current = setTimeout(() => {
        setSaveStatus('saving')
        // Compute word count from HTML content
        const text = html.replace(/<[^>]*>/g, '').trim()
        const wc = text ? text.split(/\s+/).length : 0
        // Save to data store
        store.updateScene(currentSceneId, { content: html, wordCount: wc })
        setSaveStatus('saved')
      }, 1500)
    },
    [currentSceneId, store]
  )

  // Word count change handler
  const handleWordCountChange = useCallback(
    (words: number, chars: number) => {
      setEditorStats(words, chars)
    },
    [setEditorStats]
  )

  // Update editor stats from scene data
  useEffect(() => {
    if (sceneData) {
      setEditorStats(wordCount, charCount)
    }
  }, [wordCount, charCount, sceneData, setEditorStats])

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
