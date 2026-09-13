"use client";

import { BellAlertIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface RealtimeStatusFooterProps {
  isConnected: boolean;
  lastUpdate?: Date;
  realtimeEventsCount: number;
  showActivityFeed: boolean;
  activityId: string;
  onToggleActivityFeed: () => void;
}

export function RealtimeStatusFooter({
  isConnected,
  lastUpdate,
  realtimeEventsCount,
  showActivityFeed,
  activityId,
  onToggleActivityFeed,
}: RealtimeStatusFooterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="mt-10 mb-2 flex items-center justify-between border-t border-border py-4"
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-live" : "bg-muted-foreground"}`}
          />
          {isConnected && (
            <motion.div
              className="absolute inset-0 h-2 w-2 bg-live rounded-full"
              animate={{ opacity: [1, 0.5, 1], scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {isConnected ? "Real-time updates active" : "Real-time updates disconnected"}
          {lastUpdate && (
            <span className="ml-2">• Last update: {format(lastUpdate, "HH:mm:ss")}</span>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggleActivityFeed}
        aria-expanded={showActivityFeed}
        aria-controls={activityId}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
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
  );
}
