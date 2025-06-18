"use client"

import { BarChart as TremorBarChart, type BarChartProps } from "@tremor/react"
import { valueFormatter } from "@/lib/formatters"

export function ClientBarChart(props: BarChartProps) {
  return <TremorBarChart {...props} valueFormatter={valueFormatter} />
}
