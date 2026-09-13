import { isValid, parseISO } from "date-fns";

export type DateRangeValue = { from?: Date; to?: Date };
export type DateRangeInput = { from?: string; to?: string };

const chartDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
});
const rangeStartFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const rangeEndFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function startOfUtcDay(date: Date): Date {
  const result = new Date(date.getTime());
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

export function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function parseDateParameter(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const hasTime = /[T ]/.test(value);
  const hasZone = hasTime && /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(value);
  const parsed = parseISO(hasZone ? value : hasTime ? `${value}Z` : `${value}T00:00:00Z`);
  return isValid(parsed) ? startOfUtcDay(parsed) : undefined;
}

export function normalizeDateRange(range: DateRangeValue = {}, now = new Date()) {
  const to = range.to && isValid(range.to) ? startOfUtcDay(range.to) : startOfUtcDay(now);
  const from = range.from && isValid(range.from) ? startOfUtcDay(range.from) : addUtcDays(to, -29);
  return from <= to ? { from, to } : { from: to, to: from };
}

export function formatDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatChartDate(date: Date, includeYear = false): string {
  return includeYear ? rangeEndFormatter.format(date) : chartDateFormatter.format(date);
}

export function formatDateRange(range: { from: Date; to: Date }): string {
  const start =
    range.from.getUTCFullYear() === range.to.getUTCFullYear()
      ? rangeStartFormatter.format(range.from)
      : rangeEndFormatter.format(range.from);
  return `${start} — ${rangeEndFormatter.format(range.to)}`;
}

export function* eachUtcDay(from: Date, to: Date) {
  for (let day = from; day <= to; day = addUtcDays(day, 1)) yield day;
}
