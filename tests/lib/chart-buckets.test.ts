import { expect, it, vi } from "vitest";
import { createChartBuckets } from "@/lib/dashboard/chart-buckets";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { formatDateRange } from "@/lib/date-range";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createMockSupabaseClient } from "@/tests/utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

it("keeps normal ranges daily and disambiguates dates across years", () => {
  const from = new Date("2025-12-31T00:00:00Z");
  const to = new Date("2026-01-01T00:00:00Z");
  const buckets = createChartBuckets(from, to);
  expect(buckets.bucketDays).toBe(1);
  expect(buckets.labels).toEqual(["Dec 31, 2025", "Jan 1, 2026"]);
  expect(formatDateRange({ from, to })).toBe("Dec 31, 2025 — Jan 1, 2026");
});

it("bounds a valid multi-million-day range while preserving endpoint reports and version totals", async () => {
  const from = new Date("0001-01-01T00:00:00Z");
  const to = new Date("9999-12-31T00:00:00Z");
  const buckets = createChartBuckets(from, to);
  expect(buckets.labels.length).toBeLessThanOrEqual(1000);
  expect(buckets.index("invalid")).toBeUndefined();
  expect(buckets.index("0000-12-31")).toBeUndefined();
  expect(buckets.index("9999-12-31")).toBe(buckets.labels.length - 1);
  const client = createMockSupabaseClient({
    daily_counts: [
      { report_day: "0001-01-01", report_count: 3 },
      { report_day: "0001-01-02", report_count: 4 },
      { report_day: "9999-12-31", report_count: 5 },
    ],
    version_adoption: [
      { report_date: "0001-01-01", app_version: "date", user_count: 2 },
      { report_date: "0001-01-02", app_version: "date", user_count: 3 },
      { report_date: "9999-12-31", app_version: "__proto__", user_count: 4 },
    ],
  });
  vi.mocked(createSupabaseServerClient).mockReturnValue(client);
  const data = await getDashboardData("all", { from, to });
  expect(data.reports_timeseries.length).toBeLessThanOrEqual(1000);
  expect(data.reports_timeseries.reduce((sum, row) => sum + row.Reports, 0)).toBe(12);
  expect(data.reports_timeseries[0].Reports).toBe(7);
  expect(data.reports_timeseries.at(-1)?.Reports).toBe(5);
  expect(data.version_adoption[0]["Version date"]).toBe(5);
  expect(data.version_adoption[1]["Version __proto__"]).toBe(4);
  expect(data.version_adoption.every((row) => typeof row.date === "string")).toBe(true);
});
