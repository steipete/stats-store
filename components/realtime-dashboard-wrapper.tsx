"use client"

import { BellIcon, SparklesIcon } from "@heroicons/react/24/outline"
import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { toast } from "sonner"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"

interface RealtimeDashboardWrapperProps {
  children: React.ReactNode
  selectedAppId: string
  initialKpis?: {
    unique_installs: number | string
    reports_this_period: number | string
    latest_version: string
  }
}

export function RealtimeDashboardWrapper({ children, selectedAppId }: RealtimeDashboardWrapperProps) {
  const [showRealtimeIndicator, setShowRealtimeIndicator] = useState(false)
  const [latestEvent, setLatestEvent] = useState<string | null>(null)

  const { isConnected, lastUpdate, realtimeEvents } = useRealtimeStats({
    appId: selectedAppId,
    onMilestone: (event) => {
      // Celebrate milestones
      toast.success(`Milestone reached! 🎉`, {
        description: event.event_data.message,
        duration: 5000,
      })
    },
    onNewUser: (event) => {
      // Show toast notification for new users
      toast.success(`New user detected!`, {
        description: `App version: ${event.event_data.app_version}`,
        icon: <SparklesIcon className="h-4 w-4" />,
      })
      setLatestEvent("New user joined")

      // Flash the indicator
      setShowRealtimeIndicator(true)
      setTimeout(() => setShowRealtimeIndicator(false), 3000)
    },
    onVersionUpdate: (event) => {
      // Notify about version updates
      toast.info(`New version detected: ${event.event_data.new_version}`)
    },
  })

  // Merge real-time KPIs with initial data
  // Const realtimeKpis = statsCache.kpis
  //   ? {
  //       Unique_installs: statsCache.kpis.unique_users_today,
  //       Reports_this_period: statsCache.kpis.total_reports_today,
  //       Latest_version: statsCache.latest_version?.version || initialKpis?.latest_version || "N/A",
  //     }
  //   : initialKpis

  return (
    <div className="relative">
      {/* Real-time connection indicator */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg shadow-lg"
          >
            <div className="relative">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              {showRealtimeIndicator && (
                <motion.div
                  className="absolute inset-0 h-2 w-2 bg-green-500 rounded-full"
                  animate={{ opacity: [1, 0, 1], scale: [1, 2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
            <span className="text-sm text-muted-foreground">Real-time updates active</span>
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">• Last: {new Date(lastUpdate).toLocaleTimeString()}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Latest event notification */}
      <AnimatePresence>
        {latestEvent && showRealtimeIndicator && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg"
          >
            <BellIcon className="h-4 w-4" />
            <span className="text-sm">{latestEvent}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pass real-time data to children via context or props */}
      <div className="space-y-6">
        {/* We'll need to modify children components to accept real-time props */}
        {children}
      </div>

      {/* Real-time activity feed (optional) */}
      {realtimeEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-card border border-border rounded-lg"
        >
          <h3 className="text-sm font-medium mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {realtimeEvents.slice(0, 5).map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {event.event_type === "new_user" && "New user"}
                  {event.event_type === "milestone" && "Milestone"}
                  {event.event_type === "version_update" && "Version update"}
                  {event.event_type === "report_batch" && "Batch update"}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleTimeString()}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
