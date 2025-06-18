"use client"

import { useRealtimeStats } from "@/hooks/use-realtime-stats"
import { RealtimeKpiCard } from "./realtime-kpi-card"
import { motion, AnimatePresence } from "framer-motion"
import { Toaster } from "sonner"
import { valueFormatter } from "@/lib/formatters"
import { useEffect, useState } from "react"
import { SparklesIcon, BellAlertIcon } from "@heroicons/react/24/outline"
import { format } from "date-fns"

interface RealtimeDashboardProps {
  selectedAppId: string
  dateRange: { from: Date; to: Date }
  initialData: {
    kpis: {
      unique_installs: number | string
      reports_this_period: number | string
      latest_version: string
    }
    kpisError?: {
      unique_installs?: string
      reports_this_period?: string
      latest_version?: string
    }
  }
  hideStatusIndicator?: boolean
  onStatusChange?: (status: { isConnected: boolean; lastUpdate?: Date; realtimeEventsCount: number }) => void
}

export function RealtimeDashboard({ selectedAppId, dateRange, initialData, hideStatusIndicator = false, onStatusChange }: RealtimeDashboardProps) {
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [previousKpis, setPreviousKpis] = useState(initialData.kpis)

  const { isConnected, lastUpdate, realtimeEvents, statsCache } = useRealtimeStats({
    appId: selectedAppId,
  })
  
  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({ isConnected, lastUpdate, realtimeEventsCount: realtimeEvents.length })
    }
  }, [isConnected, lastUpdate, realtimeEvents.length, onStatusChange])

  // Merge real-time data with initial data
  const currentKpis = {
    unique_installs: statsCache.kpis?.unique_users_today ?? initialData.kpis.unique_installs,
    reports_this_period: statsCache.kpis?.total_reports_today ?? initialData.kpis.reports_this_period,
    latest_version: statsCache.latest_version?.version ?? initialData.kpis.latest_version,
  }

  // Track previous values for animation
  useEffect(() => {
    if (statsCache.kpis) {
      setPreviousKpis(currentKpis)
    }
  }, [statsCache.kpis])

  return (
    <>
      <Toaster position="top-right" richColors />

      {/* Connection Status */}
      {!hideStatusIndicator && (
        <AnimatePresence>
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 flex items-center justify-between"
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
                {realtimeEvents.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {realtimeEvents.length}
                  </span>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* KPI Cards with real-time updates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <RealtimeKpiCard
          title="Unique Users"
          value={
            typeof currentKpis.unique_installs === "string"
              ? currentKpis.unique_installs
              : valueFormatter(currentKpis.unique_installs)
          }
          previousValue={
            typeof previousKpis.unique_installs === "string"
              ? previousKpis.unique_installs
              : valueFormatter(previousKpis.unique_installs)
          }
          iconName="users"
          iconColor="blue"
          error={!!initialData.kpisError?.unique_installs}
          tooltip="Distinct users identified by daily IP hash"
          isRealtime={isConnected}
          lastUpdate={lastUpdate || undefined}
        />

        <RealtimeKpiCard
          title="Total Reports"
          value={
            typeof currentKpis.reports_this_period === "string"
              ? currentKpis.reports_this_period
              : valueFormatter(currentKpis.reports_this_period)
          }
          previousValue={
            typeof previousKpis.reports_this_period === "string"
              ? previousKpis.reports_this_period
              : valueFormatter(previousKpis.reports_this_period)
          }
          iconName="cube"
          iconColor="green"
          error={!!initialData.kpisError?.reports_this_period}
          tooltip="All telemetry reports received"
          isRealtime={isConnected}
          lastUpdate={lastUpdate || undefined}
        />

        <RealtimeKpiCard
          title="Latest Version"
          value={currentKpis.latest_version}
          previousValue={previousKpis.latest_version}
          iconName="tag"
          iconColor="amber"
          error={!!initialData.kpisError?.latest_version}
          tooltip="Most recent app version seen in reports"
          isRealtime={isConnected}
          lastUpdate={lastUpdate || undefined}
        />
      </div>

      {/* Activity Feed */}
      <AnimatePresence>
        {showActivityFeed && realtimeEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-card border border-border rounded-lg overflow-hidden"
          >
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              Recent Activity
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {realtimeEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {event.event_type === "new_user" && (
                      <>
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        <span className="text-sm">
                          New user • {event.event_data.app_version} • {event.event_data.model}
                        </span>
                      </>
                    )}
                    {event.event_type === "milestone" && (
                      <>
                        <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                        <span className="text-sm font-medium">{event.event_data.message}</span>
                      </>
                    )}
                    {event.event_type === "version_update" && (
                      <>
                        <div className="h-2 w-2 bg-blue-500 rounded-full" />
                        <span className="text-sm">Version update: {event.event_data.new_version}</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.created_at), "HH:mm:ss")}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
