'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useWriterStore } from '@/store/writer-store'

interface ActiveSession {
  sceneId: string
  startWordCount: number
  startTime: number
  saved: boolean
}

/**
 * Hook that automatically tracks writing sessions.
 * When a scene is focused, it starts tracking. When writing stops
 * (scene change or inactivity), it records a WritingSession.
 */
export function useWritingSession() {
  const { currentSceneId, currentProjectId, editorWordCount } = useWriterStore()

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastWordCountRef = useRef(editorWordCount)
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  // Keep the ref in sync without re-running the session effect below.
  useEffect(() => {
    lastWordCountRef.current = editorWordCount
  }, [editorWordCount])

  // Save a session to the API
  const saveSession = useCallback(async (session: ActiveSession, endWordCount: number) => {
    if (session.saved) return
    
    const wordsWritten = Math.max(0, endWordCount - session.startWordCount)
    if (wordsWritten <= 0) return

    const duration = Math.round((Date.now() - session.startTime) / 1000)
    if (duration < 5) return // Ignore sessions shorter than 5 seconds

    const today = new Date().toISOString().split('T')[0]

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          wordsWritten,
          duration,
          date: today,
          metadata: JSON.stringify({
            sceneId: session.sceneId,
            type: 'auto',
          }),
        }),
      })
    } catch {
      // silent - don't interrupt writing
    }
  }, [currentProjectId])

  // End the current session
  const endCurrentSession = useCallback(async (endWordCount: number) => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }

    setActiveSession((prev) => {
      if (prev) {
        saveSession(prev, endWordCount)
      }
      return null
    })
  }, [saveSession])

  // Start a new session when scene changes. Deliberately does NOT depend on
  // editorWordCount: word-count changes must only update the ref, otherwise
  // every keystroke would end + restart the session (wiping word counts).
  useEffect(() => {
    // End previous session if one exists
    setActiveSession((prev) => {
      if (prev) {
        saveSession(prev, lastWordCountRef.current)
      }

      // Start new session if we have a scene. Use the scene's own word
      // count when available (the editor store may still be at 0 while the
      // scene content loads, which would overcount the session).
      if (currentSceneId && currentProjectId) {
        lastWordCountRef.current = editorWordCount
        return {
          sceneId: currentSceneId,
          startWordCount: editorWordCount,
          startTime: Date.now(),
          saved: false,
        }
      }
      return null
    })
    // Correct the start count once the scene's real word count is known
    if (currentSceneId && currentProjectId) {
      fetch(`/api/scenes/${currentSceneId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((scene) => {
          if (scene && typeof scene.wordCount === "number" && scene.wordCount > 0) {
            setActiveSession((prev) =>
              prev && prev.sceneId === currentSceneId && prev.startWordCount < scene.wordCount
                ? { ...prev, startWordCount: scene.wordCount }
                : prev
            )
            if (lastWordCountRef.current < scene.wordCount) {
              lastWordCountRef.current = scene.wordCount
            }
          }
        })
        .catch(() => {})
    }

    return () => {
      // Cleanup on unmount
      setActiveSession((prev) => {
        if (prev) {
          saveSession(prev, lastWordCountRef.current)
        }
        return null
      })
    }
  }, [currentSceneId, currentProjectId, saveSession])

  // Track word count changes and reset inactivity timer
  useEffect(() => {
    if (editorWordCount !== lastWordCountRef.current) {
      lastWordCountRef.current = editorWordCount

      // Reset inactivity timer on word count change
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }

      // Set new inactivity timer
      inactivityTimerRef.current = setTimeout(() => {
        endCurrentSession(lastWordCountRef.current)
      }, INACTIVITY_TIMEOUT)
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [editorWordCount, endCurrentSession])

  // Handle page visibility change (tab switch = potential session end)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Start a shorter timeout when tab becomes hidden
        inactivityTimerRef.current = setTimeout(() => {
          endCurrentSession(lastWordCountRef.current)
        }, 60000) // 1 minute for hidden tab
      } else if (!document.hidden) {
        // Clear timeout when tab becomes visible again
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current)
          inactivityTimerRef.current = null
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [endCurrentSession])

  return {
    activeSession,
  }
}
