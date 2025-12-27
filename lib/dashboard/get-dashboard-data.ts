import { eachDayOfInterval, endOfDay, format, isValid, parseISO, startOfDay, subDays } from "date-fns"
import type { DateRangeValue } from "@/lib/date-range"
import { createSupabaseServerClient } from "@/lib/supabase/server"

interface App {
  id: string
  name: string
}

interface TimeSeriesDataPoint {
  date: string
  Installs: number
}

interface OsBreakdownDataPoint {
  name: string
  Users: number
}

interface CpuBreakdownDataPoint {
  name: string
  Users: number
}

interface TopModelsDataPoint {
  model: string
  count: number
}

interface LanguageDataPoint {
  name: string
  Users: number
}

interface RamDataPoint {
  name: string
  Users: number
}

interface CpuCoresDataPoint {
  name: string
  Users: number
}

interface VersionAdoptionDataPoint {
  date: string
  [key: string]: string | number
}

interface HourlyActivityDataPoint {
  hour: string
  Activity: number
}

// RPC response types
interface DailyCountRow {
  report_day: string
  report_count: number
}

interface OsVersionRow {
  os_version_name: string
  user_count: number
}

interface CpuArchRow {
  cpu_arch_name: string
  user_count: number
}

interface ModelRow {
  model_name: string
  report_count: number
}

interface LanguageRow {
  language_name: string
  user_count: number
}

interface RamRow {
  ram_gb: string
  user_count: number
}

interface CpuCoresRow {
  core_count: string
  user_count: number
}

interface VersionAdoptionRow {
  report_date: string
  app_version: string
  user_count: number
}

interface HourlyActivityRow {
  hour_of_day: number
  avg_reports: number
}

export interface DashboardData {
  apps: App[]
  appsError?: string
  kpis: {
    unique_installs: number | string
    reports_this_period: number | string
    latest_version: string
  }
  kpisError?: {
    unique_installs?: string
    reports_this_period?: string
    latest_version?: string
  }
  installs_timeseries: TimeSeriesDataPoint[]
  installs_timeseries_error?: string
  os_breakdown: OsBreakdownDataPoint[]
  os_breakdown_error?: string
  cpu_breakdown: CpuBreakdownDataPoint[]
  cpu_breakdown_error?: string
  top_models: TopModelsDataPoint[]
  top_models_error?: string
  language_breakdown: LanguageDataPoint[]
  language_breakdown_error?: string
  ram_breakdown: RamDataPoint[]
  ram_breakdown_error?: string
  cpu_cores_breakdown: CpuCoresDataPoint[]
  cpu_cores_breakdown_error?: string
  version_adoption: VersionAdoptionDataPoint[]
  version_adoption_error?: string
  hourly_activity: HourlyActivityDataPoint[]
  hourly_activity_error?: string
}

export async function getDashboardData(
  selectedAppIdParam: string | undefined,
  dateRange: DateRangeValue | undefined
): Promise<DashboardData> {
  const supabase = createSupabaseServerClient()

  const isUuid =
    typeof selectedAppIdParam === "string" &&
    selectedAppIdParam !== "all" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedAppIdParam)

  const rangeFrom =
    dateRange?.from && isValid(dateRange.from) ? startOfDay(dateRange.from) : startOfDay(subDays(new Date(), 29))
  const rangeToStart = dateRange?.to && isValid(dateRange.to) ? startOfDay(dateRange.to) : startOfDay(new Date())
  const queryFromDay = rangeFrom <= rangeToStart ? rangeFrom : rangeToStart
  const queryToDay = rangeFrom <= rangeToStart ? rangeToStart : rangeFrom
  const queryTo = endOfDay(queryToDay)

  const p_app_id_filter = isUuid ? selectedAppIdParam : null
  const rpcParams = {
    p_app_id_filter,
    p_end_date_filter: queryTo.toISOString(),
    p_start_date_filter: queryFromDay.toISOString(),
  }

  const appsPromise = supabase.from("apps").select("id, name").order("name")
  const reportCountsPromise = (() => {
    let query = supabase.from("reports").select("ip_hash", { count: "exact" })
    if (p_app_id_filter) {
      query = query.eq("app_id", p_app_id_filter)
    }
    return query.gte("received_at", rpcParams.p_start_date_filter).lte("received_at", rpcParams.p_end_date_filter)
  })()

  const latestVersionPromise = supabase.rpc("get_latest_app_version", {
    app_id_filter: p_app_id_filter,
    end_date_filter: rpcParams.p_end_date_filter,
    start_date_filter: rpcParams.p_start_date_filter,
  })
  const dailyCountsPromise = supabase.rpc("get_daily_report_counts", {
    app_id_filter: p_app_id_filter,
    end_date_filter: rpcParams.p_end_date_filter,
    start_date_filter: rpcParams.p_start_date_filter,
  })
  const osPromise = supabase.rpc("get_os_version_distribution", rpcParams)
  const cpuPromise = supabase.rpc("get_cpu_architecture_distribution", rpcParams)
  const topModelsPromise = supabase.rpc("get_top_models", { ...rpcParams, p_limit_count: 10 })
  const languagePromise = supabase.rpc("get_language_distribution", { ...rpcParams, p_limit_count: 10 })
  const ramPromise = supabase.rpc("get_ram_distribution", rpcParams)
  const cpuCoresPromise = supabase.rpc("get_cpu_cores_distribution", rpcParams)
  const versionPromise = supabase.rpc("get_version_adoption_timeline", { ...rpcParams, p_top_versions: 5 })
  const hourlyPromise = supabase.rpc("get_hourly_activity_pattern", {
    p_app_id_filter,
    p_end_date_filter: rpcParams.p_end_date_filter,
    p_start_date_filter: startOfDay(subDays(queryTo, 6)).toISOString(),
  })

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
  ])

  let appsList: App[] = []
  let appsErrorMessage: string | undefined
  if (appsRes.error) {
    console.error("Error fetching apps:", appsRes.error.message)
    appsErrorMessage = "Could not load app list."
  } else {
    appsList = (appsRes.data || []) as App[]
  }

  let uniqueInstallsCount: number | string = 0
  let reportsThisPeriodCount: number | string = 0
  let kpiErrorMessage: string | undefined
  if (reportCountsRes.error) {
    console.error("Error fetching KPI report counts:", reportCountsRes.error.message)
    kpiErrorMessage = "Could not load report counts."
    uniqueInstallsCount = "Error"
    reportsThisPeriodCount = "Error"
  } else {
    reportsThisPeriodCount = reportCountsRes.count ?? 0
    const hashes =
      reportCountsRes.data
        ?.map((r) => r.ip_hash)
        .filter((hash): hash is string => typeof hash === "string" && hash.length > 0) ?? []
    uniqueInstallsCount = new Set(hashes).size
  }

  let latestVersionValue = "N/A"
  let latestVersionErrorMessage: string | undefined
  if (latestVersionRes.error) {
    console.error("Error fetching latest app version (RPC):", latestVersionRes.error.message)
    latestVersionErrorMessage = "Could not load latest version."
    latestVersionValue = "Error"
  } else if (latestVersionRes.data) {
    latestVersionValue = latestVersionRes.data
  }

  let installsTimeseries: TimeSeriesDataPoint[] = []
  let installsTimeseriesErrorMessage: string | undefined
  if (dailyCountsRes.error) {
    console.error("Error fetching daily report counts (RPC):", dailyCountsRes.error.message)
    installsTimeseriesErrorMessage = "Could not load installations data."
  } else if (dailyCountsRes.data) {
    const countsByDay = new Map<string, number>()
    dailyCountsRes.data.forEach((row: DailyCountRow) => {
      countsByDay.set(row.report_day, Number(row.report_count) || 0)
    })
    const dateInterval = eachDayOfInterval({ end: queryToDay, start: queryFromDay })
    installsTimeseries = dateInterval.map((dayInInterval) => {
      const formattedDayKey = format(dayInInterval, "yyyy-MM-dd")
      const formattedDateLabel = format(dayInInterval, "MMM dd")
      return { Installs: countsByDay.get(formattedDayKey) || 0, date: formattedDateLabel }
    })
  }

  let osBreakdown: OsBreakdownDataPoint[] = []
  let osBreakdownErrorMessage: string | undefined
  if (osRes.error) {
    console.error("Error fetching OS breakdown (RPC):", osRes.error.message)
    osBreakdownErrorMessage = "Could not load OS distribution."
  } else if (osRes.data) {
    osBreakdown = osRes.data.map((item: OsVersionRow) => ({
      Users: Number(item.user_count) || 0,
      name: `macOS ${item.os_version_name}`,
    }))
  }

  let cpuBreakdown: CpuBreakdownDataPoint[] = []
  let cpuBreakdownErrorMessage: string | undefined
  if (cpuRes.error) {
    console.error("Error fetching CPU breakdown (RPC):", cpuRes.error.message)
    cpuBreakdownErrorMessage = "Could not load CPU architecture data."
  } else if (cpuRes.data) {
    cpuBreakdown = cpuRes.data.map((item: CpuArchRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.cpu_arch_name,
    }))
  }

  let topModels: TopModelsDataPoint[] = []
  let topModelsErrorMessage: string | undefined
  if (modelRes.error) {
    console.error("Error fetching top models (RPC):", modelRes.error.message)
    topModelsErrorMessage = "Could not load top models data."
  } else if (modelRes.data) {
    topModels = modelRes.data.map((item: ModelRow) => ({
      count: Number(item.report_count) || 0,
      model: item.model_name,
    }))
  }

  let languageBreakdown: LanguageDataPoint[] = []
  let languageBreakdownErrorMessage: string | undefined
  if (languageRes.error) {
    console.error("Error fetching language breakdown (RPC):", languageRes.error.message)
    languageBreakdownErrorMessage = "Could not load language distribution."
  } else if (languageRes.data) {
    languageBreakdown = languageRes.data.map((item: LanguageRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.language_name,
    }))
  }

  let ramBreakdown: RamDataPoint[] = []
  let ramBreakdownErrorMessage: string | undefined
  if (ramRes.error) {
    console.error("Error fetching RAM breakdown (RPC):", ramRes.error.message)
    ramBreakdownErrorMessage = "Could not load RAM distribution."
  } else if (ramRes.data) {
    ramBreakdown = ramRes.data.map((item: RamRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.ram_gb,
    }))
  }

  let cpuCoresBreakdown: CpuCoresDataPoint[] = []
  let cpuCoresBreakdownErrorMessage: string | undefined
  if (cpuCoresRes.error) {
    console.error("Error fetching CPU cores breakdown (RPC):", cpuCoresRes.error.message)
    cpuCoresBreakdownErrorMessage = "Could not load CPU cores distribution."
  } else if (cpuCoresRes.data) {
    cpuCoresBreakdown = cpuCoresRes.data.map((item: CpuCoresRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.core_count,
    }))
  }

  let versionAdoption: VersionAdoptionDataPoint[] = []
  let versionAdoptionErrorMessage: string | undefined
  if (versionRes.error) {
    console.error("Error fetching version adoption (RPC):", versionRes.error.message)
    versionAdoptionErrorMessage = "Could not load version adoption data."
  } else if (versionRes.data) {
    const versionsByDay = new Map<string, Map<string, number>>()
    const allVersions = new Set<string>()

    versionRes.data.forEach((row: VersionAdoptionRow) => {
      const dayKey = row.report_date.slice(0, 10)
      const perDay = versionsByDay.get(dayKey) ?? new Map<string, number>()
      perDay.set(row.app_version, Number(row.user_count) || 0)
      versionsByDay.set(dayKey, perDay)
      allVersions.add(row.app_version)
    })

    versionAdoption = [...versionsByDay.entries()]
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([dayKey, versions]) => {
        const parsed = parseISO(dayKey)
        const label = isValid(parsed) ? format(parsed, "MMM dd") : dayKey
        const dataPoint: VersionAdoptionDataPoint = { date: label }
        allVersions.forEach((version) => {
          dataPoint[version] = versions.get(version) ?? 0
        })
        return dataPoint
      })
  }

  let hourlyActivity: HourlyActivityDataPoint[] = []
  let hourlyActivityErrorMessage: string | undefined
  if (hourlyRes.error) {
    console.error("Error fetching hourly activity (RPC):", hourlyRes.error.message)
    hourlyActivityErrorMessage = "Could not load activity pattern."
  } else if (hourlyRes.data) {
    hourlyActivity = hourlyRes.data.map((item: HourlyActivityRow) => ({
      Activity: Number(item.avg_reports) || 0,
      hour: `${item.hour_of_day}:00`,
    }))
  }

  return {
    apps: appsList,
    appsError: appsErrorMessage,
    cpu_breakdown: cpuBreakdown,
    cpu_breakdown_error: cpuBreakdownErrorMessage,
    cpu_cores_breakdown: cpuCoresBreakdown,
    cpu_cores_breakdown_error: cpuCoresBreakdownErrorMessage,
    hourly_activity: hourlyActivity,
    hourly_activity_error: hourlyActivityErrorMessage,
    installs_timeseries: installsTimeseries,
    installs_timeseries_error: installsTimeseriesErrorMessage,
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
  }
}
