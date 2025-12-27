"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

interface RealtimeEventBase {
  id: number
  app_id: string
  created_at: string
}

type RealtimeEvent =
  | (RealtimeEventBase & {
      event_type: "new_user"
      event_data: { app_version: string; model: string; total_reports_today?: number; unique_users_today?: number }
    })
  | (RealtimeEventBase & {
      event_type: "milestone"
      event_data: { message: string }
    })
  | (RealtimeEventBase & {
      event_type: "version_update"
      event_data: { new_version: string }
    })
  | (RealtimeEventBase & {
      event_type: "report_batch"
      event_data: Record<string, unknown>
    })

interface StatsCache {
  kpis?: {
    unique_users_today: number
    total_reports_today: number
    last_update: string
  }
  os_distribution?: { os_version: string; count: number }[]
  cpu_distribution?: { cpu_arch: string; count: number }[]
  hourly_reports?: { hour: number; count: number }[]
  latest_version?: { version: string }
}

interface UseRealtimeStatsOptions {
  appId?: string
  onNewUser?: (event: Extract<RealtimeEvent, { event_type: "new_user" }>) => void
  onMilestone?: (event: Extract<RealtimeEvent, { event_type: "milestone" }>) => void
  onVersionUpdate?: (event: Extract<RealtimeEvent, { event_type: "version_update" }>) => void
}

export function useRealtimeStats(options: UseRealtimeStatsOptions = {}) {
  const { appId, onNewUser, onMilestone, onVersionUpdate } = options
  const onNewUserRef = useRef(onNewUser)
  const onMilestoneRef = useRef(onMilestone)
  const onVersionUpdateRef = useRef(onVersionUpdate)

  useEffect(() => {
    onNewUserRef.current = onNewUser
    onMilestoneRef.current = onMilestone
    onVersionUpdateRef.current = onVersionUpdate
  }, [onNewUser, onMilestone, onVersionUpdate])

  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | undefined>(undefined)
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([])
  const [statsCache, setStatsCache] = useState<StatsCache>({})

  // Memoize supabase client to prevent recreating on every render
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }

    return createBrowserClient(url, anonKey)
  }, [])

  // Fetch initial stats cache
  const fetchStatsCache = useCallback(async () => {
    let query = supabase.from("stats_cache").select("*").order("updated_at", { ascending: false })

    if (appId && appId !== "all") {
      query = query.eq("app_id", appId)
    }

    const { data, error } = await query

    if (!error && data) {
      const cache: StatsCache = {}

      data.forEach((stat) => {
        const row = stat as { stat_type: string; stat_data: unknown }

        switch (row.stat_type) {
          case "kpis": {
            cache.kpis = row.stat_data as StatsCache["kpis"]
            break
          }
          case "os_distribution": {
            cache.os_distribution = row.stat_data as StatsCache["os_distribution"]
            break
          }
          case "cpu_distribution": {
            cache.cpu_distribution = row.stat_data as StatsCache["cpu_distribution"]
            break
          }
          case "hourly_reports": {
            cache.hourly_reports = row.stat_data as StatsCache["hourly_reports"]
            break
          }
          case "latest_version": {
            cache.latest_version = row.stat_data as StatsCache["latest_version"]
            break
          }
        }
      })

      setStatsCache(cache)
    }
  }, [appId, supabase])

  useEffect(() => {
    let channel: RealtimeChannel | null
    let isSubscribed = false

    const setupRealtimeSubscription = async () => {
      // Prevent multiple subscriptions
      if (isSubscribed) {
        return
      }

      // Fetch initial cache
      await fetchStatsCache()

      // Subscribe to realtime events
      const channelName = appId && appId !== "all" ? `app-stats-${appId}` : "all-app-stats"

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "realtime_events",
            ...(appId && appId !== "all" ? { filter: `app_id=eq.${appId}` } : {}),
          },
          (payload) => {
            const event = payload.new as unknown as RealtimeEvent

            // Update events list (keep last 50)
            setRealtimeEvents((prev) => [event, ...prev].slice(0, 50))
            setLastUpdate(new Date())

            // Call event handlers
            switch (event.event_type) {
              case "new_user": {
                onNewUserRef.current?.(event)
                const uniqueUsersToday = event.event_data.unique_users_today
                const totalReportsToday = event.event_data.total_reports_today
                if (typeof uniqueUsersToday === "number" && typeof totalReportsToday === "number") {
                  setStatsCache((prev) => ({
                    ...prev,
                    kpis: {
                      last_update: new Date().toISOString(),
                      total_reports_today: totalReportsToday,
                      unique_users_today: uniqueUsersToday,
                    },
                  }))
                }
                // Refresh cached aggregates (kpis, latest version, etc.)
                void fetchStatsCache()
                break
              }
              case "milestone": {
                onMilestoneRef.current?.(event)
                break
              }
              case "version_update": {
                onVersionUpdateRef.current?.(event)
                setStatsCache((prev) => ({
                  ...prev,
                  latest_version: { version: event.event_data.new_version },
                }))
                break
              }
              case "report_batch": {
                // Refetch cache after batch update
                void fetchStatsCache()
                break
              }
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "stats_cache",
            ...(appId && appId !== "all" ? { filter: `app_id=eq.${appId}` } : {}),
          },
          (payload) => {
            const updated = payload.new as unknown as { stat_type: string; stat_data: unknown }

            // Update specific cache entry
            setStatsCache((prev) => {
              const newCache = { ...prev }

              switch (updated.stat_type) {
                case "kpis": {
                  newCache.kpis = updated.stat_data as StatsCache["kpis"]
                  break
                }
                case "os_distribution": {
                  newCache.os_distribution = updated.stat_data as StatsCache["os_distribution"]
                  break
                }
                case "cpu_distribution": {
                  newCache.cpu_distribution = updated.stat_data as StatsCache["cpu_distribution"]
                  break
                }
                case "hourly_reports": {
                  newCache.hourly_reports = updated.stat_data as StatsCache["hourly_reports"]
                  break
                }
                case "latest_version": {
                  newCache.latest_version = updated.stat_data as StatsCache["latest_version"]
                  break
                }
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

    void setupRealtimeSubscription()

    return () => {
      isSubscribed = false
      if (channel) {
        void channel.unsubscribe()
        void supabase.removeChannel(channel)
      }
    }
  }, [appId, fetchStatsCache, supabase])

  return {
    isConnected,
    lastUpdate,
    realtimeEvents,
    refreshCache: fetchStatsCache,
    statsCache,
  }
}
