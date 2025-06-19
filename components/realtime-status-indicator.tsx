"use client"

import { motion, AnimatePresence } from "framer-motion"
import { BellAlertIcon } from "@heroicons/react/24/outline"
import { format } from "date-fns"

interface RealtimeStatusIndicatorProps {
  isConnected: boolean
  lastUpdate?: Date
  showActivityFeed: boolean
  setShowActivityFeed: (show: boolean) => void
  realtimeEventsCount: number
}

export function RealtimeStatusIndicator({
  isConnected,
  lastUpdate,
  showActivityFeed,
  setShowActivityFeed,
  realtimeEventsCount,
}: RealtimeStatusIndicatorProps) {
  return (
    <AnimatePresence>
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="flex items-center justify-between py-4 border-t border-border"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <motion.div
                className="absolute inset-0 h-2 w-2 bg-green-500 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              Real-time updates active
              {lastUpdate && <span className="ml-2">• Last update: {format(lastUpdate, "HH:mm:ss")}</span>}
            </span>
          </div>

          <button
            onClick={() => setShowActivityFeed(!showActivityFeed)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
          >
            <BellAlertIcon className="h-4 w-4" />
            Activity Feed
            {realtimeEventsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {realtimeEventsCount}
              </span>
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
