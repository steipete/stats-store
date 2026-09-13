import type { SupabaseClient } from "@supabase/supabase-js";

type SeriesResult<Row> = { data: Row[] | null; error: { message: string } | null };

export async function getSeriesRows<Row>(
  client: SupabaseClient,
  name: "get_daily_report_counts" | "get_version_adoption_timeline",
  params: Record<string, unknown>,
): Promise<SeriesResult<Row>> {
  const first = await client.rpc(name, params, { count: "exact" });
  if (first.error) return { data: null, error: first.error };
  if (!Array.isArray(first.data)) return { data: null, error: { message: "Missing series rows" } };
  const rows = first.data.slice() as Row[];
  const total = first.count ?? (rows.length === 0 ? 0 : Number.NaN);
  if (!Number.isSafeInteger(total) || total < rows.length) {
    return { data: null, error: { message: "Missing exact series count" } };
  }
  while (rows.length < total) {
    const page = await client
      .rpc(name, params, { count: "exact" })
      .range(rows.length, Math.min(rows.length + 999, total - 1));
    if (page.error) return { data: null, error: page.error };
    if (!Array.isArray(page.data) || page.data.length === 0) {
      return { data: null, error: { message: "Series pagination ended before all rows arrived" } };
    }
    rows.push(...(page.data as Row[]));
  }
  return { data: rows, error: null };
}
