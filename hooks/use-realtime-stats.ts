"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";

interface RealtimeEventBase {
  id: number;
  app_id: string;
  created_at: string;
}
export type RealtimeEvent =
  | (RealtimeEventBase & {
      event_type: "new_user";
      event_data: {
        app_version: string | null;
        model: string | null;
        report_day?: string;
        unique_users_today?: number;
        total_reports_today?: number;
      };
    })
  | (RealtimeEventBase & {
      event_type: "milestone";
      event_data: { message: string; report_day?: string };
    })
  | (RealtimeEventBase & { event_type: "version_update"; event_data: { new_version: string } })
  | (RealtimeEventBase & { event_type: "report_batch"; event_data: Record<string, unknown> });

interface UseRealtimeStatsOptions {
  appId?: string;
  onInvalidate?: () => void;
  onNewUser?: (event: Extract<RealtimeEvent, { event_type: "new_user" }>) => void;
  onMilestone?: (event: Extract<RealtimeEvent, { event_type: "milestone" }>) => void;
  onVersionUpdate?: (event: Extract<RealtimeEvent, { event_type: "version_update" }>) => void;
}

interface RealtimeState {
  appId?: string;
  isConnected: boolean;
  lastUpdate?: Date;
  realtimeEvents: RealtimeEvent[];
}
function initialState(appId?: string): RealtimeState {
  return { appId, isConnected: false, realtimeEvents: [] };
}

export function useRealtimeStats(options: UseRealtimeStatsOptions = {}) {
  const appId = options.appId && options.appId !== "all" ? options.appId : undefined;
  const instanceId = useId();
  const generation = useRef(0);
  const [state, setState] = useState(() => initialState(appId));
  const current = state.appId === appId ? state : initialState(appId);
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey)
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return createBrowserClient(url, anonKey);
  }, []);

  const notify = useEffectEvent((event: RealtimeEvent) => {
    switch (event.event_type) {
      case "new_user":
        options.onNewUser?.(event);
        break;
      case "milestone":
        options.onMilestone?.(event);
        break;
      case "version_update":
        options.onVersionUpdate?.(event);
        break;
    }
    options.onInvalidate?.();
  });
  const invalidate = useEffectEvent(() => options.onInvalidate?.());

  useEffect(() => {
    let active = true;
    const updateState = (update: (previous: RealtimeState) => RealtimeState) => {
      if (active)
        setState((previous) => update(previous.appId === appId ? previous : initialState(appId)));
    };
    const filter = appId ? { filter: `app_id=eq.${appId}` } : {};
    // Supabase reuses channels by name. Each effect owns a distinct channel, including Strict Mode remounts.
    const channelName = `${appId ? `app-stats-${appId}` : "all-app-stats"}-${instanceId}-${++generation.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "realtime_events", ...filter },
        (payload) => {
          if (!active) return;
          const event = payload.new as RealtimeEvent;
          if (
            !["new_user", "milestone", "version_update", "report_batch"].includes(event.event_type)
          )
            return;
          updateState((previous) => ({
            ...previous,
            realtimeEvents: [event, ...previous.realtimeEvents].slice(0, 50),
            lastUpdate: new Date(),
          }));
          notify(event);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stats_cache", ...filter },
        () => {
          if (!active) return;
          updateState((previous) => ({ ...previous, lastUpdate: new Date() }));
          invalidate();
        },
      )
      .subscribe((state) => {
        if (!active) return;
        updateState((previous) => ({ ...previous, isConnected: state === "SUBSCRIBED" }));
        if (state === "SUBSCRIBED") invalidate();
      });
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [appId, instanceId, supabase]);

  return {
    isConnected: current.isConnected,
    lastUpdate: current.lastUpdate,
    realtimeEvents: current.realtimeEvents,
  };
}
