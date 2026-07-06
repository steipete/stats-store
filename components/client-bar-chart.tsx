"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { useElementSize } from "@/hooks/use-element-size";
import { valueFormatter } from "@/lib/formatters";
import {
  chartAxisTick,
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  resolveSeriesColor,
  toNumber,
} from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

export interface ClientBarChartProps<T extends object = Record<string, unknown>> {
  className?: string;
  data: T[];
  index: string;
  categories: string[];
  colors?: string[];
  layout?: "horizontal" | "vertical";
  yAxisWidth?: number;
  showAnimation?: boolean;
  stack?: boolean;
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
  const isVertical = layout === "vertical";
  const { ref, size } = useElementSize<HTMLDivElement>();
  const isReady = size.width > 0 && size.height > 0;

  return (
    <div ref={ref} className={cn("w-full", className)} data-testid="bar-chart">
      {isReady ? (
        <BarChart
          width={size.width}
          height={size.height}
          data={data as unknown as Record<string, unknown>[]}
          layout={isVertical ? "vertical" : "horizontal"}
          barCategoryGap="28%"
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeOpacity={0.6}
            vertical={isVertical}
            horizontal={!isVertical}
          />
          {isVertical ? (
            <>
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={chartAxisTick}
                tickFormatter={(v) => valueFormatter(toNumber(v))}
              />
              <YAxis
                type="category"
                dataKey={index}
                width={yAxisWidth}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={chartAxisTick}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={index}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={chartAxisTick}
              />
              <YAxis
                width={yAxisWidth}
                tickLine={false}
                axisLine={false}
                tick={chartAxisTick}
                tickFormatter={(v) => valueFormatter(toNumber(v))}
              />
            </>
          )}
          <Tooltip
            formatter={(v) => valueFormatter(toNumber(v))}
            contentStyle={chartTooltipContentStyle}
            labelStyle={chartTooltipLabelStyle}
            itemStyle={chartTooltipItemStyle}
            cursor={{ fill: "var(--accent)", fillOpacity: 0.5 }}
          />
          {categories.map((category, seriesIndex) => (
            <Bar
              key={category}
              dataKey={category}
              fill={resolveSeriesColor(colors, seriesIndex)}
              radius={3}
              maxBarSize={isVertical ? 14 : 28}
              isAnimationActive={showAnimation}
              stackId={stack ? "a" : undefined}
            />
          ))}
        </BarChart>
      ) : null}
    </div>
  );
}
