import type { CSSProperties } from "react";

/** Ordered "Ink & Ember" palette: ember, gold, mint, sky, orchid. */
export const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** Legacy color-name aliases kept so existing callers/tests keep working. */
const colorMap: Record<string, string> = {
  amber: "var(--chart-2)",
  blue: "var(--chart-1)",
  cyan: "var(--chart-3)",
  green: "var(--chart-3)",
  orange: "var(--chart-1)",
  purple: "var(--chart-5)",
  rose: "var(--chart-5)",
  teal: "var(--chart-3)",
};

export function resolveSeriesColor(colors: string[] | undefined, seriesIndex: number): string {
  const requested = colors?.[seriesIndex];
  if (requested && requested in colorMap) {
    return colorMap[requested];
  }
  return CHART_PALETTE[seriesIndex % CHART_PALETTE.length];
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export const chartTooltipContentStyle: CSSProperties = {
  background: "var(--tooltip-bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.4)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  padding: "8px 12px",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "var(--tooltip-foreground)",
  fontWeight: 600,
  marginBottom: 2,
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "var(--tooltip-foreground)",
  opacity: 0.85,
  padding: 0,
};

export const chartAxisTick = {
  fill: "var(--muted-foreground)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
} as const;
