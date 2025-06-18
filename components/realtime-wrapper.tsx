"use client"

import { useState } from "react"
import { RealtimeDashboard } from "./realtime-dashboard"
import { RealtimeStatusFooter } from "./realtime-status-footer"

interface RealtimeWrapperProps {
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
  children: React.ReactNode
}

export function RealtimeWrapper({ selectedAppId, dateRange, initialData, children }: RealtimeWrapperProps) {
  const [realtimeStatus, setRealtimeStatus] = useState({
    isConnected: false,
    lastUpdate: undefined as Date | undefined,
    realtimeEventsCount: 0,
  })

  return (
    <>
      <RealtimeDashboard
        selectedAppId={selectedAppId}
        dateRange={dateRange}
        initialData={initialData}
        hideStatusIndicator={true}
        onStatusChange={setRealtimeStatus}
      />
      {children}
      <RealtimeStatusFooter
        isConnected={realtimeStatus.isConnected}
        lastUpdate={realtimeStatus.lastUpdate}
        realtimeEventsCount={realtimeStatus.realtimeEventsCount}
      />
    </>
  )
}