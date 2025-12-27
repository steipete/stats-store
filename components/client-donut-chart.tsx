"use client"

import { Cell, Pie, PieChart, Tooltip } from "recharts"
import { useElementSize } from "@/hooks/use-element-size"
import { valueFormatter } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export interface ClientDonutChartProps<T extends object = Record<string, unknown>> {
  className?: string
  data: T[]
  category: string
  index: string
  colors?: string[]
  showAnimation?: boolean
  variant?: "donut" | "pie"
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

function resolveSliceColor(colors: string[] | undefined, sliceIndex: number) {
  const requested = colors?.[sliceIndex]
  if (requested && requested in colorMap) {
    return colorMap[requested]
  }
  const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
  return palette[sliceIndex % palette.length]
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

export function ClientDonutChart<T extends object = Record<string, unknown>>({
  className,
  data,
  category,
  index,
  colors,
  showAnimation = true,
  variant = "donut",
}: ClientDonutChartProps<T>) {
  const isPie = variant === "pie"
  const { ref, size } = useElementSize<HTMLDivElement>()
  const isReady = size.width > 0 && size.height > 0

  return (
    <div ref={ref} className={cn("w-full", className)} data-testid="donut-chart">
      {isReady ? (
        <PieChart width={size.width} height={size.height}>
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
          <Pie
            data={data as unknown as Record<string, unknown>[]}
            dataKey={category}
            nameKey={index}
            cx="50%"
            cy="50%"
            innerRadius={isPie ? 0 : "60%"}
            outerRadius="90%"
            paddingAngle={2}
            isAnimationActive={showAnimation}
          >
            {data.map((_, sliceIndex) => (
              <Cell key={String(sliceIndex)} fill={resolveSliceColor(colors, sliceIndex)} />
            ))}
          </Pie>
        </PieChart>
      ) : null}
    </div>
  )
}
