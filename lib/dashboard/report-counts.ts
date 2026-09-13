import type { SupabaseClient } from "@supabase/supabase-js";
import { addUtcDays } from "@/lib/date-range";

type ReportFilters = {
  p_app_id_filter: string | null;
  p_start_date_filter: string;
  p_end_date_filter: string;
};
interface ReportCounts {
  unique_client_days: number;
  total_reports: number;
}
type CountsResult = { data: ReportCounts | null; error: { message: string } | null };

export async function getReportCounts(
  client: SupabaseClient,
  filters: ReportFilters,
): Promise<CountsResult> {
  const result = await client.rpc("get_report_counts", filters);
  if (!result.error) {
    const counts = result.data?.[0] as ReportCounts | undefined;
    return counts
      ? { data: counts, error: null }
      : { data: null, error: { message: "Missing report-count result" } };
  }
  if (result.error.code !== "PGRST202") return { data: null, error: result.error };

  // Existing deployments may run the app before applying the new aggregate RPC migration.
  // Descending ID cursors avoid OFFSET scans and exclude newly appended reports after the first page.
  const hashes = new Set<string>();
  let totalReports = 0;
  let cursor: number | undefined;
  const endExclusive = addUtcDays(new Date(filters.p_end_date_filter), 1).toISOString();
  while (true) {
    let query = client
      .from("reports")
      .select("id, ip_hash")
      .gte("received_at", filters.p_start_date_filter)
      .lt("received_at", endExclusive)
      .order("id", { ascending: false })
      .limit(1000);
    if (filters.p_app_id_filter) query = query.eq("app_id", filters.p_app_id_filter);
    if (cursor !== undefined) query = query.lt("id", cursor);
    const { data, error } = await query;
    if (error) return { data: null, error };
    if (!Array.isArray(data)) return { data: null, error: { message: "Missing report page" } };
    if (data.length === 0) break;
    const nextCursor = Number(data[data.length - 1].id);
    if (!Number.isSafeInteger(nextCursor) || (cursor !== undefined && nextCursor >= cursor)) {
      return { data: null, error: { message: "Report pagination did not advance safely" } };
    }
    cursor = nextCursor;
    totalReports += data.length;
    for (const row of data) {
      if (typeof row.ip_hash === "string" && row.ip_hash.length > 0) hashes.add(row.ip_hash);
    }
  }
  return { data: { unique_client_days: hashes.size, total_reports: totalReports }, error: null };
}
