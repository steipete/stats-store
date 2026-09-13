"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { KpiCard } from "./kpi-card";

interface RealtimeKpiCardProps {
  title: string;
  value: string | number;
  iconName: "users" | "cube" | "tag";
  error?: boolean;
  tooltip?: string;
  isRealtime?: boolean;
}

export function RealtimeKpiCard({ value, isRealtime, ...props }: RealtimeKpiCardProps) {
  const previousValue = useRef(value);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (value !== previousValue.current) {
      previousValue.current = value;
      // eslint-disable-next-line react/set-state-in-effect -- Start the timed highlight when a realtime value arrives.
      setIsUpdating(true);

      // Reset animation after 1 second
      const timeout = setTimeout(() => {
        setIsUpdating(false);
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [value]);

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
        <KpiCard {...props} value={value} />

        {/* Real-time indicator */}
        {isRealtime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-6 right-1 md:right-7"
          >
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-live pulse-live" />
              {isUpdating && (
                <motion.div
                  className="absolute inset-0 h-2 w-2 bg-live rounded-full"
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
            animate={{ opacity: 0.08 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary pointer-events-none"
          />
        )}
      </div>
    </motion.div>
  );
}
