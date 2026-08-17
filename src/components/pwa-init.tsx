"use client"

import { useEffect } from "react"

/**
 * Registers the Open Writer service worker so the app works offline and is
 * installable as a PWA.
 *
 * - Uses a scope-relative path ("sw.js" next to the manifest), so it resolves
 *   correctly under the GitHub Pages basePath (/open-writer/) and locally.
 * - Skips Electron: the desktop build serves the same static bundle over
 *   localhost, where a service worker adds no value and can serve stale
 *   assets across rebuilds.
 * - Registers after load (idle-ish) so it never competes with first paint.
 */

const isElectron = () => typeof window !== "undefined" && "openWriter" in window

export function PwaInit() {
  useEffect(() => {
    if (isElectron()) return
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return // SW requires a secure context (or localhost for testing)
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      // "sw.js" resolves against the document base, which already includes
      // the basePath when deployed under /open-writer/.
      navigator.serviceWorker
        .register("sw.js")
        .then((reg) => {
          // Surface updates: when a new build ships, reload so the new
          // shell is in use promptly (hashed assets make stale caches safe).
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing
            if (!worker) return
            worker.addEventListener("statechange", () => {
              if (worker.state === "activated" && navigator.serviceWorker.controller) {
                // New worker is active behind the current page; the next
                // navigation will pick it up. Nothing else to do.
              }
            })
          })
        })
        .catch(() => {
          // SW registration is progressive enhancement — never break the app.
        })
    }, 800)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return null
}
