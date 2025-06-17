"use client"

import { Select, SelectItem, DateRangePicker, Button, type DateRangePickerValue } from "@tremor/react"
import { ArrowPathIcon } from "@heroicons/react/24/outline"
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
}

export function DashboardFilters({ apps, currentAppId, currentDateRange }: DashboardFiltersProps) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center">
      <Select value={currentAppId} onValueChange={handleAppChange}>
        <SelectItem value="all">All Apps</SelectItem>
        {apps.map((app) => (
          <SelectItem key={app.id} value={app.id}>
            {app.name}
          </SelectItem>
        ))}
      </Select>
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
