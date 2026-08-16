"use client"

import { useEffect } from "react"
import { ensureSyncEngine, statusLabel } from "@/lib/github-sync"

/**
 * Bridge between the native tray menu (Electron desktop build) and the
 * sync engine. No-ops in the browser / on GitHub Pages where
 * window.openWriter does not exist.
 *
 * - tray "Sync now"   → engine.syncNow() + checkRemote()
 * - tray "Open storage on GitHub" → opens the private storage repo
 * - engine status changes → reflected in the tray tooltip/menu
 */

interface OpenWriterBridge {
  onSyncCommand: (cb: (command: string) => void) => () => void
  sendSyncStatus: (status: { label: string; connected: boolean; repoFullName: string | null }) => void
  openExternal: (url: string) => void
}

declare global {
  interface Window {
    openWriter?: OpenWriterBridge
  }
}

export function ElectronBridge() {
  useEffect(() => {
    const bridge = window.openWriter
    if (!bridge) return

    const engine = ensureSyncEngine()

    const report = () => {
      const s = engine.getEngineSnapshot()
      bridge.sendSyncStatus({
        label: statusLabel(s.status),
        connected: s.connected,
        repoFullName: s.repoFullName,
      })
    }

    const offEngine = engine.on(report)
    report()

    const offCommand = bridge.onSyncCommand((command) => {
      if (command === "sync-now") {
        void engine
          .syncNow()
          .then(() => engine.checkRemote())
          .then(report)
      } else if (command === "open-storage") {
        const s = engine.getEngineSnapshot()
        if (s.repoFullName) {
          bridge.openExternal(`https://github.com/${s.repoFullName}`)
        } else {
          report()
        }
      }
    })

    return () => {
      offEngine()
      offCommand()
    }
  }, [])

  return null
}
