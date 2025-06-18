"use client"

import { DateRangePicker, type DateRangePickerValue } from "@tremor/react"
import {
  ExclamationCircleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline"
import { useRouter, useSearchParams } from "next/navigation"
import { format, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"

interface App {
  id: string
  name: string
}

interface DashboardFiltersProps {
  apps: App[] | null
  currentAppId: string
  currentDateRange?: DateRangePickerValue
  appsError?: string
}

export function DashboardFilters({
  apps: initialApps,
  currentAppId,
  currentDateRange,
  appsError,
}: DashboardFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const apps = initialApps || []

  const handleAppChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      newParams.delete("app")
    } else {
      newParams.set("app", value)
    }
    router.push(`/?${newParams.toString()}`)
  }

  const handleDateChange = (value: DateRangePickerValue | undefined) => {
    const newParams = new URLSearchParams(searchParams.toString())
    if (value?.from) {
      newParams.set("from", format(startOfDay(value.from), "yyyy-MM-dd"))
      if (value.to) {
        newParams.set("to", format(startOfDay(value.to), "yyyy-MM-dd"))
      } else {
        // If only 'from' is selected, set 'to' to the same day for a single-day range
        newParams.set("to", format(startOfDay(value.from), "yyyy-MM-dd"))
      }
    } else {
      newParams.delete("from")
      newParams.delete("to")
    }
    router.push(`/?${newParams.toString()}`)
  }


  const commonInputBaseClasses =
    "w-full h-10 rounded-lg bg-input text-foreground border border-input-border shadow-subtle focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-colors duration-150 ease-in-out"
  const commonErrorWarningClasses = "flex items-center space-x-2 p-2.5 border rounded-lg h-10 text-sm"

  const renderAppFilter = () => {
    if (appsError) {
      return (
        <div
          className={cn(
            commonErrorWarningClasses,
            "border-destructive/50 bg-destructive/10 text-destructive rounded-lg"
          )}
        >
          <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
          <span className="truncate">{appsError}</span>
        </div>
      )
    }

    const selectValue = currentAppId || "all"
    const options = [{ id: "all", name: "All Apps" }, ...apps]

    if (options.length === 0 && !appsError) {
      return (
        <div className={cn(commonErrorWarningClasses, "border-muted bg-muted/20 text-muted-foreground rounded-lg")}>
          <InformationCircleIcon className="h-5 w-5 shrink-0" />
          <span className="truncate">No applications found.</span>
        </div>
      )
    }

    return (
      <div
        className={cn(
          "relative w-full overflow-hidden",
          commonInputBaseClasses // This already includes rounded-lg
        )}
      >
        <select
          value={selectValue}
          onChange={(e) => handleAppChange(e.target.value)}
          className="w-full h-full appearance-none pl-3 pr-10 py-0 bg-transparent text-foreground focus:outline-none rounded-lg"
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id} className="text-foreground bg-background dark:bg-popover">
              {opt.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-center">
      {renderAppFilter()}
      <div
        className={cn(
          commonInputBaseClasses, // This provides bg-input and rounded-lg
          "p-0 flex items-center overflow-hidden" // overflow-hidden to clip internal button if needed
        )}
      >
        <DateRangePicker
          value={currentDateRange}
          onValueChange={handleDateChange}
          // Removed [&>button]:bg-transparent to let Tremor handle its button background,
          // which should be themed or use the wrapper's bg-input.
          // Added explicit text color for the button content.
          className="w-full h-full [&>button]:h-full [&>button]:w-full [&>button]:rounded-lg [&>button]:border-0 hover:[&>button]:bg-secondary/30 focus:[&>button]:ring-0 focus:outline-none [&>button]:text-foreground"
          enableYearNavigation
        />
      </div>
      <Button
        icon={ArrowPathIcon}
        onClick={handleRefresh}
        className="h-10 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-2 focus:ring-ring focus:outline-none shadow-subtle transition-colors"
      >
        Refresh
      </Button>
    </div>
  )
}
