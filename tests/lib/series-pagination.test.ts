import { expect, it, vi } from "vitest";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { addUtcDays, formatDateInput } from "@/lib/date-range";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createMockSupabaseClient } from "@/tests/utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
it("loads complete daily and version series past the server row limit", async () => {
  const from = new Date("2020-01-01T00:00:00Z");
  const dates = Array.from({ length: 1105 }, (_, day) => formatDateInput(addUtcDays(from, day)));
  const client = createMockSupabaseClient();
  vi.mocked(client.rpc).mockImplementation((name: string) => {
    let offset = 0;
    const rows =
      name === "get_daily_report_counts"
        ? dates.map((report_day) => ({ report_day, report_count: 1 }))
        : name === "get_version_adoption_timeline"
          ? dates.map((report_date) => ({ report_date, app_version: "1.0", user_count: 1 }))
          : name === "get_report_counts"
            ? [{ unique_client_days: 1105, total_reports: 1105 }]
            : [];
    const result = Object.assign(
      Promise.resolve().then(() => ({
        data: name === "get_latest_app_version" ? "1.0" : rows.slice(offset, offset + 500),
        count: rows.length,
        error: null,
      })),
      {
        range: (start: number) => {
          offset = start;
          return result;
        },
      },
    );
    return result as ReturnType<typeof client.rpc>;
  });
  vi.mocked(createSupabaseServerClient).mockReturnValue(client);
  const data = await getDashboardData("all", { from, to: addUtcDays(from, 1104) });
  expect(data.reports_timeseries).toHaveLength(553);
  expect(data.reports_timeseries.at(-1)?.Reports).toBe(1);
  expect(data.version_adoption).toHaveLength(553);
  expect(data.reports_timeseries.reduce((sum, row) => sum + row.Reports, 0)).toBe(1105);
  expect(data.version_adoption.reduce((sum, row) => sum + Number(row["Version 1.0"]), 0)).toBe(
    1105,
  );
});
