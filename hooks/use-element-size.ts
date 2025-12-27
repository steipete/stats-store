"use client"

import { useEffect, useRef, useState } from "react"

type ElementSize = { width: number; height: number }

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState<ElementSize>({ height: 0, width: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    let frame = 0

    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect()
        const width = Math.max(0, Math.round(rect.width))
        const height = Math.max(0, Math.round(rect.height))
        setSize((prev) => (prev.width === width && prev.height === height ? prev : { height, width }))
      })
    }

    update()

    const resizeObserver = new ResizeObserver(() => {
      update()
    })
    resizeObserver.observe(element)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
    }
  }, [])

  return { ref, size }
}
