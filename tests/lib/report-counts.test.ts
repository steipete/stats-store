import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

function clientWithPageCap(mode: "available" | "missing" | "failed", ignoreCursor = false) {
  const reports = Array.from({ length: 1105 }, (_, i) => ({
    id: i + 1,
    ip_hash: `hash-${i}`,
  })).reverse();
  const cursors: number[] = [];
  const from = vi.fn((table: string) => {
    let cursor: number | undefined;
    const result = Promise.resolve().then(() => ({
      data:
        table === "reports"
          ? reports
              .filter((row) => ignoreCursor || cursor === undefined || row.id < cursor)
              .slice(0, 500)
          : [],
      count: reports.length,
      error: null,
    }));
    const query = Object.assign(result, {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      gte: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      lt: vi.fn((column: string, value: number) => {
        if (column === "id") {
          cursor = value;
          cursors.push(value);
        }
        return query;
      }),
    });
    return query;
  });
  const rpc = vi.fn(async (name: string) => {
    if (name === "get_report_counts") {
      if (mode !== "available")
        return {
          data: null,
          error: { code: mode === "missing" ? "PGRST202" : "42501", message: mode },
        };
      return { data: [{ unique_client_days: 1105, total_reports: 1105 }], error: null };
    }
    return { data: name === "get_latest_app_version" ? "N/A" : [], error: null };
  });
  const client = { from, rpc } as unknown as SupabaseClient;
  vi.mocked(createSupabaseServerClient).mockReturnValue(client);
  return { from, rpc, cursors };
}
const range = { from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-09-01T00:00:00Z") };
beforeEach(() => vi.clearAllMocks());

describe("complete report counts", () => {
  it("uses database aggregates instead of a capped raw-report response", async () => {
    const { from, rpc } = clientWithPageCap("available");
    const data = await getDashboardData("all", range);
    expect(data.kpis.unique_installs).toBe(1105);
    expect(data.kpis.reports_this_period).toBe(1105);
    expect(rpc).toHaveBeenCalledWith(
      "get_report_counts",
      expect.objectContaining({ p_end_date_filter: "2026-09-01T00:00:00.000Z" }),
    );
    expect(from).not.toHaveBeenCalledWith("reports");
  });

  it("pages by report ID when an existing deployment has not applied the new RPC", async () => {
    const { cursors } = clientWithPageCap("missing");
    const data = await getDashboardData("all", range);
    expect(data.kpis.unique_installs).toBe(1105);
    expect(data.kpis.reports_this_period).toBe(1105);
    expect(cursors).toEqual([606, 106, 1]);
  });

  it("does not hide ordinary RPC failures behind the compatibility path", async () => {
    const { from } = clientWithPageCap("failed");
    const data = await getDashboardData("all", range);
    expect(data.kpis.unique_installs).toBe("Error");
    expect(from).not.toHaveBeenCalledWith("reports");
  });

  it("fails a stalled pagination response instead of looping or returning partial counts", async () => {
    const { cursors } = clientWithPageCap("missing", true);
    const data = await getDashboardData("all", range);
    expect(data.kpis.unique_installs).toBe("Error");
    expect(cursors).toEqual([606]);
  });
});
