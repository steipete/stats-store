"use client"

import { DateRangePicker, Button, type DateRangePickerValue, Text } from "@tremor/react"
import { ArrowPathIcon, ExclamationCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline"
import { useRouter, useSearchParams } from "next/navigation"
import { format, startOfDay } from "date-fns"

export const valueFormatter = (number: number): string => {
  return `${new Intl.NumberFormat("us").format(number).toString()}`
}

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
  apps: initialApps, // Renamed to avoid conflict with state if we were to use it
  currentAppId,
  currentDateRange,
  appsError,
}: DashboardFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Use initialApps directly, or an empty array if null
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
        // If only 'from' is selected, default 'to' to be the same as 'from'
        newParams.set("to", format(startOfDay(value.from), "yyyy-MM-dd"))
      }
    } else {
      newParams.delete("from")
      newParams.delete("to")
    }
    router.push(`/?${newParams.toString()}`)
  }

  const handleRefresh = () => {
    router.refresh()
  }

  const renderAppFilter = () => {
    if (appsError) {
      return (
        <div className="flex items-center space-x-2 p-2 border border-rose-500 rounded-md bg-rose-50 dark:bg-rose-900/30 h-10">
          <ExclamationCircleIcon className="h-5 w-5 text-rose-500 flex-shrink-0" />
          <Text color="rose" truncate>
            {appsError}
          </Text>
        </div>
      )
    }

    const selectValue = currentAppId || "all"
    const options = [{ id: "all", name: "All Apps" }, ...apps]

    if (options.length === 0) {
      return (
        <div className="flex items-center space-x-2 p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 h-10">
          <InformationCircleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <Text color="gray" truncate>
            No applications found.
          </Text>
        </div>
      )
    }

    return (
      <select
        value={selectValue}
        onChange={(e) => handleAppChange(e.target.value)}
        className="w-full h-10 border border-gray-300 rounded-md shadow-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center">
      {renderAppFilter()}
      <DateRangePicker
        value={currentDateRange}
        onValueChange={handleDateChange}
        className="w-full"
        enableYearNavigation
      />
      <Button icon={ArrowPathIcon} onClick={handleRefresh}>
        Refresh
      </Button>
    </div>
  )
}
