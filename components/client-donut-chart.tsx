"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { useElementSize } from "@/hooks/use-element-size";
import { valueFormatter } from "@/lib/formatters";
import {
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  resolveSeriesColor,
  toNumber,
} from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

export interface ClientDonutChartProps<T extends object = Record<string, unknown>> {
  className?: string;
  data: T[];
  category: string;
  index: string;
  colors?: string[];
  showAnimation?: boolean;
  variant?: "donut" | "pie";
}

const LEGEND_LIMIT = 6;

export function ClientDonutChart<T extends object = Record<string, unknown>>({
  className,
  data,
  category,
  index,
  colors,
  showAnimation = true,
  variant = "donut",
}: ClientDonutChartProps<T>) {
  const isPie = variant === "pie";
  const { ref, size } = useElementSize<HTMLDivElement>();
  const isReady = size.width > 0 && size.height > 0;

  const rows = data as unknown as Record<string, unknown>[];
  const total = rows.reduce((sum, row) => sum + toNumber(row[category]), 0);

  return (
    <div className={cn("flex w-full flex-col", className)} data-testid="donut-chart">
      <div ref={ref} className="min-h-0 w-full flex-1">
        {isReady ? (
          <PieChart width={size.width} height={size.height}>
            <Tooltip
              formatter={(v) => valueFormatter(toNumber(v))}
              contentStyle={chartTooltipContentStyle}
              labelStyle={chartTooltipLabelStyle}
              itemStyle={chartTooltipItemStyle}
            />
            <Pie
              data={rows}
              dataKey={category}
              nameKey={index}
              cx="50%"
              cy="50%"
              innerRadius={isPie ? 0 : "68%"}
              outerRadius="92%"
              paddingAngle={isPie ? 0 : 3}
              cornerRadius={isPie ? 0 : 3}
              stroke="none"
              isAnimationActive={showAnimation}
            >
              {rows.map((_, sliceIndex) => (
                <Cell key={String(sliceIndex)} fill={resolveSeriesColor(colors, sliceIndex)} />
              ))}
            </Pie>
          </PieChart>
        ) : null}
      </div>
      {total > 0 ? (
        <ul className="mt-4 space-y-1.5 text-xs">
          {rows.slice(0, LEGEND_LIMIT).map((row, sliceIndex) => {
            const value = toNumber(row[category]);
            const share = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <li
                key={String(row[index] ?? sliceIndex)}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: resolveSeriesColor(colors, sliceIndex) }}
                />
                <span className="min-w-0 flex-1 truncate">{String(row[index] ?? "—")}</span>
                <span className="tabular-nums text-foreground">{valueFormatter(value)}</span>
                <span className="w-9 text-right tabular-nums">{share}%</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
