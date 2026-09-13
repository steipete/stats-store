"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { type RealtimeEvent, useRealtimeStats } from "@/hooks/use-realtime-stats";
import type { DashboardData } from "@/lib/dashboard/get-dashboard-data";
import { valueFormatter } from "@/lib/formatters";
import { RealtimeKpiCard } from "./realtime-kpi-card";
import { RealtimeStatusFooter } from "./realtime-status-footer";

export interface RealtimeDashboardProps {
  selectedAppId: string;
  initialData: Pick<DashboardData, "kpis" | "kpisError">;
  children?: ReactNode;
}

const metrics = [
  {
    key: "unique_installs",
    title: "Unique Users",
    iconName: "users",
    tooltip:
      "Distinct daily IP hashes across the selected dates; a client can count once on each day.",
  },
  {
    key: "reports_this_period",
    title: "Total Reports",
    iconName: "cube",
    tooltip: "All telemetry reports received in the selected date range.",
  },
  {
    key: "latest_version",
    title: "Latest Version",
    iconName: "tag",
    tooltip: "Highest numeric app version reported in the selected date range.",
  },
] as const;

function eventDescription(event: RealtimeEvent): string {
  switch (event.event_type) {
    case "new_user":
      return ["New daily client", event.event_data.app_version, event.event_data.model]
        .filter(Boolean)
        .join(" · ");
    case "milestone":
      return event.event_data.message;
    case "version_update":
      return `Version update: ${event.event_data.new_version}`;
    case "report_batch":
      return "Update checks received";
  }
}

export function RealtimeDashboard({
  selectedAppId,
  initialData,
  children,
}: RealtimeDashboardProps) {
  const router = useRouter();
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const activityId = useId();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { isConnected, lastUpdate, realtimeEvents } = useRealtimeStats({
    appId: selectedAppId,
    onInvalidate: () => {
      if (refreshTimer.current !== undefined) return;
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = undefined;
        router.refresh();
      }, 500);
    },
    onMilestone: (event) => {
      if (selectedAppId !== "all") toast.success(event.event_data.message);
    },
  });
  useEffect(
    () => () => {
      if (refreshTimer.current !== undefined) clearTimeout(refreshTimer.current);
      refreshTimer.current = undefined;
    },
    [selectedAppId],
  );

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="mb-12 grid grid-cols-1 divide-y divide-border border-y border-border md:grid-cols-3 md:divide-x md:divide-y-0">
        {metrics.map((metric) => {
          const value = initialData.kpis[metric.key];
          return (
            <RealtimeKpiCard
              key={metric.key}
              title={metric.title}
              value={typeof value === "number" ? valueFormatter(value) : value}
              iconName={metric.iconName}
              tooltip={metric.tooltip}
              error={Boolean(initialData.kpisError?.[metric.key])}
              isRealtime={isConnected}
            />
          );
        })}
      </div>
      {children}
      <RealtimeStatusFooter
        isConnected={isConnected}
        lastUpdate={lastUpdate}
        realtimeEventsCount={realtimeEvents.length}
        showActivityFeed={showActivityFeed}
        activityId={activityId}
        onToggleActivityFeed={() => setShowActivityFeed((value) => !value)}
      />
      <AnimatePresence>
        {showActivityFeed && (
          <motion.div
            id={activityId}
            role="region"
            aria-labelledby={`${activityId}-title`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 rounded-lg border border-border bg-card/70 p-4 overflow-hidden"
          >
            <h3
              id={`${activityId}-title`}
              className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em]"
            >
              <SparklesIcon className="h-4 w-4" />
              Recent Activity
            </h3>
            {realtimeEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {realtimeEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-secondary/20 transition-colors"
                  >
                    <span className="text-sm">{eventDescription(event)}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {format(new Date(event.created_at), "HH:mm:ss")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
