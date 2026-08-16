"use client"

import { installLocalApi } from "@/lib/local-api/router"

// Module-scope side effect: installs the local API shim before any
// component effect runs, so every fetch('/api/...') is served from
// browser-local storage.
if (typeof window !== "undefined") {
  installLocalApi()
}

export function LocalApiBootstrap() {
  return null
}
