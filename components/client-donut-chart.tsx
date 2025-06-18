"use client"

import { DonutChart as TremorDonutChart, type DonutChartProps } from "@tremor/react"
import { valueFormatter } from "@/lib/formatters"

export function ClientDonutChart(props: DonutChartProps) {
  return <TremorDonutChart {...props} valueFormatter={valueFormatter} />
}
