"use client"

import { useEffect, useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { valueFormatter } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export interface ClientLineChartProps<T extends object = Record<string, unknown>> {
  className?: string
  data: T[]
  index: string
  categories: string[]
  colors?: string[]
  showAnimation?: boolean
  yAxisWidth?: number
}

const colorMap: Record<string, string> = {
  amber: "var(--chart-4)",
  blue: "var(--chart-1)",
  cyan: "var(--chart-3)",
  green: "var(--chart-2)",
  orange: "var(--chart-4)",
  purple: "var(--chart-3)",
  rose: "var(--chart-5)",
  teal: "var(--chart-2)",
}

function resolveSeriesColor(colors: string[] | undefined, seriesIndex: number) {
  const requested = colors?.[seriesIndex]
  if (requested && requested in colorMap) {
    return colorMap[requested]
  }
  const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
  return palette[seriesIndex % palette.length]
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function ClientLineChart<T extends object = Record<string, unknown>>({
  className,
  data,
  index,
  categories,
  colors,
  showAnimation = true,
  yAxisWidth = 48,
}: ClientLineChartProps<T>) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className={cn("w-full", className)} data-testid="line-chart">
      {isMounted ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
          <LineChart data={data as unknown as Record<string, unknown>[]}>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey={index}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              width={yAxisWidth}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(v) => valueFormatter(toNumber(v))}
            />
            <Tooltip
              formatter={(v) => valueFormatter(toNumber(v))}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            {categories.map((category, seriesIndex) => (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                stroke={resolveSeriesColor(colors, seriesIndex)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={showAnimation}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  )
}
