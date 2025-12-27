"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { KpiCard } from "./kpi-card"

interface RealtimeKpiCardProps {
  title: string
  value: string | number
  previousValue?: string | number
  iconName: "users" | "cube" | "tag"
  iconColor: string
  error?: boolean
  tooltip?: string
  isRealtime?: boolean
  lastUpdate?: Date
}

export function RealtimeKpiCard({ value, previousValue, isRealtime, ...props }: RealtimeKpiCardProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (value !== previousValue) {
      setIsUpdating(true)
      setDisplayValue(value)

      // Reset animation after 1 second
      const timeout = setTimeout(() => {
        setIsUpdating(false)
      }, 1000)

      return () => clearTimeout(timeout)
    }
  }, [value, previousValue])

  return (
    <motion.div
      animate={
        isUpdating
          ? {
              scale: [1, 1.02, 1],
              transition: { duration: 0.3 },
            }
          : {}
      }
    >
      <div className="relative">
        <KpiCard {...props} value={displayValue} />

        {/* Real-time indicator */}
        {isRealtime && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-2 right-2">
            <div className="relative">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              {isUpdating && (
                <motion.div
                  className="absolute inset-0 h-2 w-2 bg-green-500 rounded-full"
                  animate={{ opacity: [1, 0, 1], scale: [1, 2, 1] }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </div>
          </motion.div>
        )}

        {/* Update animation overlay */}
        {isUpdating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary rounded-lg pointer-events-none"
          />
        )}
      </div>
    </motion.div>
  )
}
