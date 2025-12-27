"use client"

import { ChartBarIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline"

interface CardStatusDisplayProps {
  error?: string
  noData?: boolean
  minHeightClassName: string
  noDataMessage?: string
}

export const CardStatusDisplay = ({
  error,
  noData,
  minHeightClassName,
  noDataMessage = "No data for selected period.",
}: CardStatusDisplayProps) => {
  if (error) {
    return (
      <div className={`${minHeightClassName} flex flex-col items-center justify-center p-4`}>
        <ExclamationCircleIcon className="h-8 w-8 text-destructive" />
        <p className="mt-2 text-center text-sm text-destructive">{error}</p>
      </div>
    )
  }
  if (noData) {
    return (
      <div className={`${minHeightClassName} flex flex-col items-center justify-center p-4`}>
        <ChartBarIcon className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-center text-sm text-muted-foreground">{noDataMessage}</p>
      </div>
    )
  }
  return null
}
