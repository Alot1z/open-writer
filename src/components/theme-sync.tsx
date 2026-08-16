"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { loadAppearanceSettings, subscribeSettings } from "@/lib/settings"

const ACCENTS: Record<string, { light: string; lightSoft: string; dark: string; darkSoft: string }> = {
  amber: { light: "#d97706", lightSoft: "#fef3c7", dark: "#f59e0b", darkSoft: "#422006" },
  emerald: { light: "#059669", lightSoft: "#d1fae5", dark: "#34d399", darkSoft: "#064e3b" },
  rose: { light: "#e11d48", lightSoft: "#ffe4e6", dark: "#fb7185", darkSoft: "#4c0519" },
  teal: { light: "#0d9488", lightSoft: "#ccfbf1", dark: "#2dd4bf", darkSoft: "#134e4a" },
  orange: { light: "#ea580c", lightSoft: "#ffedd5", dark: "#fb923c", darkSoft: "#431407" },
  violet: { light: "#7c3aed", lightSoft: "#ede9fe", dark: "#a78bfa", darkSoft: "#2e1065" },
}

/**
 * Applies the Appearance settings (theme + accent color) at runtime.
 * Subscribes to settings changes so edits apply immediately, and
 * re-evaluates the accent when the theme class flips.
 */
export function ThemeSync() {
  const { setTheme } = useTheme()

  useEffect(() => {
    let observer: MutationObserver | null = null

    const applyAccent = () => {
      const appearance = loadAppearanceSettings()
      const accent = ACCENTS[appearance.accentColor] ?? ACCENTS.amber
      const isDark = document.documentElement.classList.contains("dark")
      const root = document.documentElement
      root.style.setProperty("--writer-accent", isDark ? accent.dark : accent.light)
      root.style.setProperty("--writer-accent-soft", isDark ? accent.darkSoft : accent.lightSoft)
    }

    const apply = () => {
      const appearance = loadAppearanceSettings()
      setTheme(appearance.theme)
      // Wait a tick so next-themes has toggled the .dark class before we
      // pick the matching accent values.
      setTimeout(applyAccent, 0)
    }

    apply()

    // Re-evaluate accent when the theme class changes
    observer = new MutationObserver(() => applyAccent())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    const unsubscribe = subscribeSettings(apply)
    return () => {
      unsubscribe()
      observer?.disconnect()
    }
  }, [setTheme])

  return null
}
