"use client"

import { Select, SelectItem, DateRangePicker, Button, type DateRangePickerValue, Text } from "@tremor/react"
import { ArrowPathIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline"
import { useRouter, useSearchParams } from "next/navigation"
import { format, startOfDay } from "date-fns"

interface App {
  id: string
  name: string
}

interface DashboardFiltersProps {
  apps: App[]
  currentAppId: string
  currentDateRange?: DateRangePickerValue
  appsError?: string // New prop for app list error
}

export function DashboardFilters({ apps, currentAppId, currentDateRange, appsError }: DashboardFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

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
        newParams.set("to", format(startOfDay(value.from), "yyyy-MM-dd")) // Default 'to' to 'from' if not selected
      }
    } else {
      // If 'from' is cleared, remove both 'from' and 'to'
      newParams.delete("from")
      newParams.delete("to")
    }
    router.push(`/?${newParams.toString()}`)
  }

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center">
      {appsError ? (
        <div className="flex items-center space-x-2 p-2 border border-rose-500 rounded-md bg-rose-50 dark:bg-rose-900/30">
          <ExclamationCircleIcon className="h-5 w-5 text-rose-500" />
          <Text color="rose">{appsError}</Text>
        </div>
      ) : (
        <Select value={currentAppId} onValueChange={handleAppChange} disabled={apps.length === 0}>
          <SelectItem value="all">All Apps</SelectItem>
          {apps.map((app) => (
            <SelectItem key={app.id} value={app.id}>
              {app.name}
            </SelectItem>
          ))}
        </Select>
      )}
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
