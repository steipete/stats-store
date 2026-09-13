import { createChartBuckets } from "@/lib/dashboard/chart-buckets";
import { addUtcDays, normalizeDateRange, type DateRangeValue } from "@/lib/date-range";
import { normalizeAppId } from "@/lib/dashboard/filters";
import { getReportCounts } from "@/lib/dashboard/report-counts";
import { getSeriesRows } from "@/lib/dashboard/series-rows";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface App {
  id: string;
  name: string;
}

interface TimeSeriesDataPoint {
  date: string;
  Reports: number;
}

interface DistributionDataPoint {
  name: string;
  Users: number;
}

interface TopModelsDataPoint {
  model: string;
  count: number;
}

interface VersionAdoptionDataPoint {
  date: string;
  [key: string]: string | number;
}

interface HourlyActivityDataPoint {
  hour: string;
  Activity: number;
}

// RPC response types
interface DailyCountRow {
  report_day: string;
  report_count: number;
}

interface OsVersionRow {
  os_version_name: string;
  user_count: number;
}

interface CpuArchRow {
  cpu_arch_name: string;
  user_count: number;
}

interface ModelRow {
  model_name: string;
  report_count: number;
}

interface LanguageRow {
  language_name: string;
  user_count: number;
}

interface RamRow {
  ram_gb: string;
  user_count: number;
}

interface CpuCoresRow {
  core_count: string;
  user_count: number;
}

interface VersionAdoptionRow {
  report_date: string;
  app_version: string;
  user_count: number;
}

interface HourlyActivityRow {
  hour_of_day: number;
  avg_reports: number;
}

export interface DashboardData {
  apps: App[];
  chart_bucket_days: number;
  appsError?: string;
  kpis: {
    unique_installs: number | string;
    reports_this_period: number | string;
    latest_version: string;
  };
  kpisError?: {
    unique_installs?: string;
    reports_this_period?: string;
    latest_version?: string;
  };
  reports_timeseries: TimeSeriesDataPoint[];
  reports_timeseries_error?: string;
  os_breakdown: DistributionDataPoint[];
  os_breakdown_error?: string;
  cpu_breakdown: DistributionDataPoint[];
  cpu_breakdown_error?: string;
  top_models: TopModelsDataPoint[];
  top_models_error?: string;
  language_breakdown: DistributionDataPoint[];
  language_breakdown_error?: string;
  ram_breakdown: DistributionDataPoint[];
  ram_breakdown_error?: string;
  cpu_cores_breakdown: DistributionDataPoint[];
  cpu_cores_breakdown_error?: string;
  version_adoption: VersionAdoptionDataPoint[];
  version_adoption_error?: string;
  hourly_activity: HourlyActivityDataPoint[];
  hourly_activity_error?: string;
}

function mapRows<Row, Point>(
  result: { data: Row[] | null; error: { message: string } | null },
  map: (row: Row) => Point,
  context: string,
  errorMessage: string,
): { data: Point[]; error?: string } {
  if (result.error) {
    console.error(`Error fetching ${context} (RPC):`, result.error.message);
    return { data: [], error: errorMessage };
  }
  return { data: (result.data ?? []).map(map) };
}

export async function getDashboardData(
  selectedAppIdParam: string | undefined,
  dateRange: DateRangeValue | undefined,
): Promise<DashboardData> {
  const supabase = createSupabaseServerClient();

  const selectedAppId = normalizeAppId(selectedAppIdParam);
  const { from: queryFromDay, to: queryToDay } = normalizeDateRange(dateRange);
  const p_app_id_filter = selectedAppId === "all" ? null : selectedAppId;
  const rpcParams = {
    p_app_id_filter,
    p_end_date_filter: queryToDay.toISOString(),
    p_start_date_filter: queryFromDay.toISOString(),
  };

  const appsPromise = supabase.from("apps").select("id, name").order("name");
  const reportCountsPromise = getReportCounts(supabase, rpcParams);

  const latestVersionPromise = supabase.rpc("get_latest_app_version", {
    app_id_filter: p_app_id_filter,
    end_date_filter: rpcParams.p_end_date_filter,
    start_date_filter: rpcParams.p_start_date_filter,
  });
  const dailyCountsPromise = getSeriesRows<DailyCountRow>(supabase, "get_daily_report_counts", {
    app_id_filter: p_app_id_filter,
    end_date_filter: rpcParams.p_end_date_filter,
    start_date_filter: rpcParams.p_start_date_filter,
  });
  const osPromise = supabase.rpc("get_os_version_distribution", rpcParams);
  const cpuPromise = supabase.rpc("get_cpu_architecture_distribution", rpcParams);
  const topModelsPromise = supabase.rpc("get_top_models", { ...rpcParams, p_limit_count: 10 });
  const languagePromise = supabase.rpc("get_language_distribution", {
    ...rpcParams,
    p_limit_count: 10,
  });
  const ramPromise = supabase.rpc("get_ram_distribution", rpcParams);
  const cpuCoresPromise = supabase.rpc("get_cpu_cores_distribution", rpcParams);
  const versionPromise = getSeriesRows<VersionAdoptionRow>(
    supabase,
    "get_version_adoption_timeline",
    {
      ...rpcParams,
      p_top_versions: 5,
    },
  );
  const hourlyPromise = supabase.rpc("get_hourly_activity_pattern", {
    p_app_id_filter,
    p_end_date_filter: rpcParams.p_end_date_filter,
    p_start_date_filter: addUtcDays(queryToDay, -6).toISOString(),
  });

  const [
    appsRes,
    reportCountsRes,
    latestVersionRes,
    dailyCountsRes,
    osRes,
    cpuRes,
    modelRes,
    languageRes,
    ramRes,
    cpuCoresRes,
    versionRes,
    hourlyRes,
  ] = await Promise.all([
    appsPromise,
    reportCountsPromise,
    latestVersionPromise,
    dailyCountsPromise,
    osPromise,
    cpuPromise,
    topModelsPromise,
    languagePromise,
    ramPromise,
    cpuCoresPromise,
    versionPromise,
    hourlyPromise,
  ]);

  let appsList: App[] = [];
  let appsErrorMessage: string | undefined;
  if (appsRes.error) {
    console.error("Error fetching apps:", appsRes.error.message);
    appsErrorMessage = "Could not load app list.";
  } else {
    appsList = (appsRes.data || []) as App[];
  }

  let uniqueInstallsCount: number | string = 0;
  let reportsThisPeriodCount: number | string = 0;
  let kpiErrorMessage: string | undefined;
  if (reportCountsRes.error || !reportCountsRes.data) {
    console.error("Error fetching KPI report counts:", reportCountsRes.error?.message);
    kpiErrorMessage = "Could not load report counts.";
    uniqueInstallsCount = "Error";
    reportsThisPeriodCount = "Error";
  } else {
    reportsThisPeriodCount = reportCountsRes.data.total_reports;
    uniqueInstallsCount = reportCountsRes.data.unique_client_days;
  }

  let latestVersionValue = "N/A";
  let latestVersionErrorMessage: string | undefined;
  if (latestVersionRes.error) {
    console.error("Error fetching latest app version (RPC):", latestVersionRes.error.message);
    latestVersionErrorMessage = "Could not load latest version.";
    latestVersionValue = "Error";
  } else if (latestVersionRes.data) {
    latestVersionValue = latestVersionRes.data;
  }

  const buckets = createChartBuckets(queryFromDay, queryToDay);
  let reportsTimeseries: TimeSeriesDataPoint[] = [];
  let reportsTimeseriesErrorMessage: string | undefined;
  if (dailyCountsRes.error) {
    console.error("Error fetching daily report counts (RPC):", dailyCountsRes.error.message);
    reportsTimeseriesErrorMessage = "Could not load report data.";
  } else if (dailyCountsRes.data) {
    const counts = buckets.labels.map(() => 0);
    for (const row of dailyCountsRes.data) {
      const index = buckets.index(row.report_day);
      if (index !== undefined) counts[index] += Number(row.report_count) || 0;
    }
    reportsTimeseries = buckets.labels.map((date, index) => ({ date, Reports: counts[index] }));
  }

  const { data: osBreakdown, error: osBreakdownErrorMessage } = mapRows(
    osRes,
    (item: OsVersionRow) => ({
      Users: Number(item.user_count) || 0,
      name: `macOS ${item.os_version_name}`,
    }),
    "OS breakdown",
    "Could not load OS distribution.",
  );

  const { data: cpuBreakdown, error: cpuBreakdownErrorMessage } = mapRows(
    cpuRes,
    (item: CpuArchRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.cpu_arch_name,
    }),
    "CPU breakdown",
    "Could not load CPU architecture data.",
  );

  const { data: topModels, error: topModelsErrorMessage } = mapRows(
    modelRes,
    (item: ModelRow) => ({
      count: Number(item.report_count) || 0,
      model: item.model_name,
    }),
    "top models",
    "Could not load top models data.",
  );

  const { data: languageBreakdown, error: languageBreakdownErrorMessage } = mapRows(
    languageRes,
    (item: LanguageRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.language_name,
    }),
    "language breakdown",
    "Could not load language distribution.",
  );

  const { data: ramBreakdown, error: ramBreakdownErrorMessage } = mapRows(
    ramRes,
    (item: RamRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.ram_gb,
    }),
    "RAM breakdown",
    "Could not load RAM distribution.",
  );

  const { data: cpuCoresBreakdown, error: cpuCoresBreakdownErrorMessage } = mapRows(
    cpuCoresRes,
    (item: CpuCoresRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.core_count,
    }),
    "CPU cores breakdown",
    "Could not load CPU cores distribution.",
  );

  let versionAdoption: VersionAdoptionDataPoint[] = [];
  let versionAdoptionErrorMessage: string | undefined;
  if (versionRes.error) {
    console.error("Error fetching version adoption (RPC):", versionRes.error.message);
    versionAdoptionErrorMessage = "Could not load version adoption data.";
  } else if (versionRes.data) {
    const versionsByBucket = new Map<number, Map<string, number>>();
    const allVersions = new Set<string>();

    for (const row of versionRes.data) {
      const index = buckets.index(row.report_date);
      if (index === undefined) continue;
      const perBucket = versionsByBucket.get(index) ?? new Map<string, number>();
      const version = `Version ${row.app_version}`;
      perBucket.set(version, (perBucket.get(version) ?? 0) + (Number(row.user_count) || 0));
      versionsByBucket.set(index, perBucket);
      allVersions.add(version);
    }

    versionAdoption = [...versionsByBucket.entries()]
      .toSorted(([a], [b]) => a - b)
      .map(([index, versions]) => ({
        date: buckets.labels[index],
        ...Object.fromEntries(
          [...allVersions].map((version) => [version, versions.get(version) ?? 0]),
        ),
      }));
  }

  const { data: hourlyActivity, error: hourlyActivityErrorMessage } = mapRows(
    hourlyRes,
    (item: HourlyActivityRow) => ({
      Activity: Number(item.avg_reports) || 0,
      hour: `${item.hour_of_day}:00`,
    }),
    "hourly activity",
    "Could not load activity pattern.",
  );

  return {
    apps: appsList,
    chart_bucket_days: buckets.bucketDays,
    appsError: appsErrorMessage,
    cpu_breakdown: cpuBreakdown,
    cpu_breakdown_error: cpuBreakdownErrorMessage,
    cpu_cores_breakdown: cpuCoresBreakdown,
    cpu_cores_breakdown_error: cpuCoresBreakdownErrorMessage,
    hourly_activity: hourlyActivity,
    hourly_activity_error: hourlyActivityErrorMessage,
    reports_timeseries: reportsTimeseries,
    reports_timeseries_error: reportsTimeseriesErrorMessage,
    kpis: {
      unique_installs: uniqueInstallsCount,
      reports_this_period: reportsThisPeriodCount,
      latest_version: latestVersionValue,
    },
    kpisError: {
      unique_installs: kpiErrorMessage,
      reports_this_period: kpiErrorMessage,
      latest_version: latestVersionErrorMessage,
    },
    language_breakdown: languageBreakdown,
    language_breakdown_error: languageBreakdownErrorMessage,
    os_breakdown: osBreakdown,
    os_breakdown_error: osBreakdownErrorMessage,
    ram_breakdown: ramBreakdown,
    ram_breakdown_error: ramBreakdownErrorMessage,
    top_models: topModels,
    top_models_error: topModelsErrorMessage,
    version_adoption: versionAdoption,
    version_adoption_error: versionAdoptionErrorMessage,
  };
}
