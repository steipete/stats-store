"use client"

import { LineChart as TremorLineChart, type LineChartProps } from "@tremor/react"
import { valueFormatter } from "@/lib/formatters"

// Re-define props if necessary, or use LineChartProps directly if it doesn't include valueFormatter
// For simplicity, we'll assume LineChartProps is suitable and we'll always override valueFormatter.
// If LineChartProps requires valueFormatter, this is fine.
// If it's optional, this ensures it's always set from the client side.

export function ClientLineChart(props: LineChartProps) {
  return <TremorLineChart {...props} valueFormatter={valueFormatter} />
}
