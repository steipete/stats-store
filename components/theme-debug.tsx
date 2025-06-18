"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeDebug() {
  const { theme, resolvedTheme, systemTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [htmlClass, setHtmlClass] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      const classes = document.documentElement.className
      setHtmlClass(classes)
    }
  }, [mounted, theme, resolvedTheme])

  if (!mounted) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card p-4 rounded-lg shadow-lg border text-xs">
      <div>Theme: {theme}</div>
      <div>Resolved: {resolvedTheme}</div>
      <div>System: {systemTheme}</div>
      <div>HTML Classes: {htmlClass || "none"}</div>
      <div className="flex gap-2 mt-2">
        <button 
          onClick={() => setTheme("light")}
          className="px-2 py-1 bg-primary text-primary-foreground rounded"
        >
          Light
        </button>
        <button 
          onClick={() => setTheme("dark")}
          className="px-2 py-1 bg-primary text-primary-foreground rounded"
        >
          Dark
        </button>
        <button 
          onClick={() => setTheme("system")}
          className="px-2 py-1 bg-primary text-primary-foreground rounded"
        >
          System
        </button>
      </div>
    </div>
  )
}