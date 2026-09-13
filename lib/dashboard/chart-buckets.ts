import { addUtcDays, formatChartDate, parseDateParameter } from "@/lib/date-range";

const DAY_MS = 86_400_000;
const MAX_POINTS = 1000;

export function createChartBuckets(from: Date, to: Date) {
  const days = Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;
  const bucketDays = Math.max(1, Math.ceil(days / MAX_POINTS));
  const includeYear = from.getUTCFullYear() !== to.getUTCFullYear();
  const labels = Array.from({ length: Math.ceil(days / bucketDays) }, (_, index) => {
    const start = addUtcDays(from, index * bucketDays);
    const end = addUtcDays(from, Math.min((index + 1) * bucketDays, days) - 1);
    const label = formatChartDate(start, includeYear);
    return start.getTime() === end.getTime()
      ? label
      : `${label} – ${formatChartDate(end, includeYear)}`;
  });
  return {
    bucketDays,
    labels,
    index(date: string): number | undefined {
      const day = parseDateParameter(date);
      if (!day || day < from || day > to) return undefined;
      return Math.floor((day.getTime() - from.getTime()) / DAY_MS / bucketDays);
    },
  };
}
