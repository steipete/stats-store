"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { RealtimeChannel } from "@supabase/supabase-js"

interface RealtimeEvent {
  id: number
  app_id: string
  event_type: "new_user" | "milestone" | "version_update" | "report_batch"
  event_data: any
  created_at: string
}

interface StatsCache {
  kpis?: {
    unique_users_today: number
    total_reports_today: number
    last_update: string
  }
  os_distribution?: Array<{ os_version: string; count: number }>
  cpu_distribution?: Array<{ cpu_arch: string; count: number }>
  hourly_reports?: Array<{ hour: number; count: number }>
  latest_version?: { version: string }
}

interface UseRealtimeStatsOptions {
  appId?: string
  onNewUser?: (event: RealtimeEvent) => void
  onMilestone?: (event: RealtimeEvent) => void
  onVersionUpdate?: (event: RealtimeEvent) => void
}

export function useRealtimeStats(options: UseRealtimeStatsOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([])
  const [statsCache, setStatsCache] = useState<StatsCache>({})

  // Memoize supabase client to prevent recreating on every render
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  )

  // Fetch initial stats cache
  const fetchStatsCache = useCallback(async () => {
    const query = supabase.from("stats_cache").select("*").order("updated_at", { ascending: false })

    if (options.appId && options.appId !== "all") {
      query.eq("app_id", options.appId)
    }

    const { data, error } = await query

    if (!error && data) {
      const cache: StatsCache = {}

      data.forEach((stat) => {
        switch (stat.stat_type) {
          case "kpis":
            cache.kpis = stat.stat_data
            break
          case "os_distribution":
            cache.os_distribution = stat.stat_data
            break
          case "cpu_distribution":
            cache.cpu_distribution = stat.stat_data
            break
          case "hourly_reports":
            cache.hourly_reports = stat.stat_data
            break
          case "latest_version":
            cache.latest_version = stat.stat_data
            break
        }
      })

      setStatsCache(cache)
    }
  }, [options.appId, supabase])

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let isSubscribed = false

    const setupRealtimeSubscription = async () => {
      // Prevent multiple subscriptions
      if (isSubscribed) return

      // Fetch initial cache
      await fetchStatsCache()

      // Subscribe to realtime events
      const channelName = options.appId && options.appId !== "all" ? `app-stats-${options.appId}` : "all-app-stats"

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "realtime_events",
            ...(options.appId && options.appId !== "all" ? { filter: `app_id=eq.${options.appId}` } : {}),
          },
          (payload) => {
            const event = payload.new as RealtimeEvent

            // Update events list (keep last 50)
            setRealtimeEvents((prev) => [event, ...prev].slice(0, 50))
            setLastUpdate(new Date())

            // Call event handlers
            switch (event.event_type) {
              case "new_user":
                options.onNewUser?.(event)
                // Update KPIs from event data
                setStatsCache((prev) => ({
                  ...prev,
                  kpis: {
                    unique_users_today: event.event_data.unique_users_today,
                    total_reports_today: event.event_data.total_reports_today,
                    last_update: new Date().toISOString(),
                  },
                }))
                break
              case "milestone":
                options.onMilestone?.(event)
                break
              case "version_update":
                options.onVersionUpdate?.(event)
                setStatsCache((prev) => ({
                  ...prev,
                  latest_version: { version: event.event_data.new_version },
                }))
                break
              case "report_batch":
                // Refetch cache after batch update
                fetchStatsCache()
                break
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "stats_cache",
            ...(options.appId && options.appId !== "all" ? { filter: `app_id=eq.${options.appId}` } : {}),
          },
          (payload) => {
            const updated = payload.new as any

            // Update specific cache entry
            setStatsCache((prev) => {
              const newCache = { ...prev }

              switch (updated.stat_type) {
                case "kpis":
                  newCache.kpis = updated.stat_data
                  break
                case "os_distribution":
                  newCache.os_distribution = updated.stat_data
                  break
                case "cpu_distribution":
                  newCache.cpu_distribution = updated.stat_data
                  break
                case "hourly_reports":
                  newCache.hourly_reports = updated.stat_data
                  break
                case "latest_version":
                  newCache.latest_version = updated.stat_data
                  break
              }

              return newCache
            })

            setLastUpdate(new Date())
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsConnected(true)
            isSubscribed = true
          } else if (status === "CLOSED") {
            setIsConnected(false)
            isSubscribed = false
          }
        })
    }

    setupRealtimeSubscription()

    return () => {
      isSubscribed = false
      if (channel) {
        channel.unsubscribe()
        supabase.removeChannel(channel)
      }
    }
  }, [options.appId, fetchStatsCache, supabase])

  return {
    isConnected,
    lastUpdate,
    realtimeEvents,
    statsCache,
    refreshCache: fetchStatsCache,
  }
}
