"use client"

import { useEffect } from "react"
import { initSync } from "@/lib/github-sync"

/**
 * Boots the GitHub sync engine on app start: restores a saved session,
 * reconnects to the private storage repo, and starts background sync.
 * Rendering nothing — purely a side effect.
 */
export function SyncInit() {
  useEffect(() => {
    void initSync()
  }, [])
  return null
}
