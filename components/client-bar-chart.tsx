"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { valueFormatter } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export interface ClientBarChartProps<T extends object = Record<string, unknown>> {
  className?: string
  data: T[]
  index: string
  categories: string[]
  colors?: string[]
  layout?: "horizontal" | "vertical"
  yAxisWidth?: number
  showAnimation?: boolean
  stack?: boolean
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

export function ClientBarChart<T extends object = Record<string, unknown>>({
  className,
  data,
  index,
  categories,
  colors,
  layout = "horizontal",
  yAxisWidth = 120,
  showAnimation = true,
  stack = false,
}: ClientBarChartProps<T>) {
  const isVertical = layout === "vertical"
  return (
    <div className={cn("w-full", className)} data-testid="bar-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data as unknown as Record<string, unknown>[]} layout={isVertical ? "vertical" : "horizontal"}>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
          {isVertical ? (
            <>
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(v) => valueFormatter(toNumber(v))}
              />
              <YAxis
                type="category"
                dataKey={index}
                width={yAxisWidth}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
            </>
          ) : (
            <>
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
            </>
          )}
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
            <Bar
              key={category}
              dataKey={category}
              fill={resolveSeriesColor(colors, seriesIndex)}
              radius={4}
              isAnimationActive={showAnimation}
              stackId={stack ? "a" : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
