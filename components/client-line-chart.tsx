"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
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

export interface ClientLineChartProps<T extends object = Record<string, unknown>> {
  className?: string;
  data: T[];
  index: string;
  categories: string[];
  colors?: string[];
  showAnimation?: boolean;
  yAxisWidth?: number;
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
  const gradientId = useId();
  const { ref, size } = useElementSize<HTMLDivElement>();
  const isReady = size.width > 0 && size.height > 0;

  return (
    <div ref={ref} className={cn("w-full", className)} data-testid="line-chart">
      {isReady ? (
        <AreaChart
          width={size.width}
          height={size.height}
          data={data as unknown as Record<string, unknown>[]}
        >
          <defs>
            {categories.map((category, seriesIndex) => (
              <linearGradient
                key={category}
                id={`${gradientId}-${seriesIndex}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={resolveSeriesColor(colors, seriesIndex)}
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor={resolveSeriesColor(colors, seriesIndex)}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
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
          <Tooltip
            formatter={(v) => valueFormatter(toNumber(v))}
            contentStyle={chartTooltipContentStyle}
            labelStyle={chartTooltipLabelStyle}
            itemStyle={chartTooltipItemStyle}
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
          />
          {categories.map((category, seriesIndex) => (
            <Area
              key={category}
              type="monotone"
              dataKey={category}
              stroke={resolveSeriesColor(colors, seriesIndex)}
              strokeWidth={1.75}
              fill={`url(#${gradientId}-${seriesIndex})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={showAnimation}
            />
          ))}
        </AreaChart>
      ) : null}
    </div>
  );
}
