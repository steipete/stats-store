"use client";

import { ChartBarIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

interface CardStatusDisplayProps {
  error?: string;
  noData?: boolean;
  minHeightClassName: string;
  noDataMessage?: string;
}

export const CardStatusDisplay = ({
  error,
  noData,
  minHeightClassName,
  noDataMessage = "No data for selected period.",
}: CardStatusDisplayProps) => {
  if (error) {
    return (
      <div
        className={`${minHeightClassName} flex flex-col items-center justify-center rounded-md border border-dashed border-destructive/40 p-4`}
      >
        <ExclamationCircleIcon className="h-6 w-6 text-destructive" />
        <p className="mt-3 max-w-xs text-center text-xs uppercase tracking-[0.14em] text-destructive">
          {error}
        </p>
      </div>
    );
  }
  if (noData) {
    return (
      <div
        className={`${minHeightClassName} flex flex-col items-center justify-center rounded-md border border-dashed border-border p-4`}
      >
        <ChartBarIcon className="h-6 w-6 text-muted-foreground/50" />
        <p className="mt-3 text-center text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {noDataMessage}
        </p>
      </div>
    );
  }
  return null;
};
