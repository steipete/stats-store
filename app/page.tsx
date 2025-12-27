import { eachDayOfInterval, format, parseISO, startOfDay, subDays } from "date-fns"
import type { Metadata } from "next"
import { Suspense } from "react"
import { CardStatusDisplay } from "@/components/card-status-display"
import { ClientBarChart } from "@/components/client-bar-chart"
import { ClientDonutChart } from "@/components/client-donut-chart"
import { ClientLineChart } from "@/components/client-line-chart"
import { DashboardFilters } from "@/components/dashboard-filters"
import { KpiCard } from "@/components/kpi-card"
import { RealtimeWrapper } from "@/components/realtime-wrapper"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DateRangeValue } from "@/lib/date-range"
import { valueFormatter } from "@/lib/formatters"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  description:
    "View detailed statistics and analytics for your applications, including installations, user demographics, OS versions, CPU architectures, and top models. Make data-driven decisions.",
  title: "stats.store - Fast, open, privacy-first analytics for Sparkle",
}

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

interface DashboardData {
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

async function getDashboardData(
  selectedAppIdParam: string | undefined,
  dateRange: DateRangeValue | undefined
): Promise<DashboardData> {
  const supabase = createSupabaseServerClient()
  let appsList: App[] = []
  let appsErrorMessage: string | undefined
  const { data: appsData, error: appsError } = await supabase.from("apps").select("id, name").order("name")
  if (appsError) {
    console.error("Error fetching apps:", appsError.message)
    appsErrorMessage = "Could not load app list."
  } else {
    appsList = (appsData || []) as App[]
  }
  const queryFrom = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(subDays(new Date(), 29))
  const queryTo = dateRange?.to ? startOfDay(dateRange.to) : startOfDay(new Date())
  const rpcParams = {
    p_app_id_filter: selectedAppIdParam && selectedAppIdParam !== "all" ? selectedAppIdParam : null,
    p_end_date_filter: queryTo.toISOString(),
    p_start_date_filter: queryFrom.toISOString(),
  }
  let uniqueInstallsCount: number | string = 0
  let reportsThisPeriodCount: number | string = 0
  let kpiErrorMessage: string | undefined
  try {
    let query = supabase.from("reports").select("ip_hash", { count: "exact" })
    if (rpcParams.p_app_id_filter) {
      query = query.eq("app_id", rpcParams.p_app_id_filter)
    }
    query = query.gte("received_at", rpcParams.p_start_date_filter)
    query = query.lte("received_at", rpcParams.p_end_date_filter)
    const { data: reportCountsData, error: reportCountsError, count } = await query
    if (reportCountsError) {
      throw reportCountsError
    }
    reportsThisPeriodCount = count ?? 0
    uniqueInstallsCount = new Set(reportCountsData?.map((r) => r.ip_hash)).size
  } catch (error) {
    console.error("Error fetching KPI report counts:", error instanceof Error ? error.message : error)
    kpiErrorMessage = "Could not load report counts."
    uniqueInstallsCount = "Error"
    reportsThisPeriodCount = "Error"
  }
  let latestVersionValue = "N/A"
  let latestVersionErrorMessage: string | undefined
  const { data: latestVersionDataRpc, error: latestVersionRpcError } = await supabase.rpc("get_latest_app_version", {
    app_id_filter: rpcParams.p_app_id_filter,
    end_date_filter: rpcParams.p_end_date_filter,
    start_date_filter: rpcParams.p_start_date_filter,
  })
  if (latestVersionRpcError) {
    console.error("Error fetching latest app version (RPC):", latestVersionRpcError.message)
    latestVersionErrorMessage = "Could not load latest version."
    latestVersionValue = "Error"
  } else if (latestVersionDataRpc) {
    latestVersionValue = latestVersionDataRpc
  }
  let installsTimeseries: TimeSeriesDataPoint[] = []
  let installsTimeseriesErrorMessage: string | undefined
  const { data: dailyCountsData, error: dailyCountsError } = await supabase.rpc("get_daily_report_counts", {
    app_id_filter: rpcParams.p_app_id_filter,
    end_date_filter: rpcParams.p_end_date_filter,
    start_date_filter: rpcParams.p_start_date_filter,
  })
  if (dailyCountsError) {
    console.error("Error fetching daily report counts (RPC):", dailyCountsError.message)
    installsTimeseriesErrorMessage = "Could not load installations data."
  } else if (dailyCountsData) {
    const countsByDay: { [key: string]: number } = {}
    dailyCountsData.forEach((row: DailyCountRow) => {
      countsByDay[row.report_day] = Number(row.report_count) || 0
    })
    const dateInterval = eachDayOfInterval({ end: queryTo, start: queryFrom })
    installsTimeseries = dateInterval.map((dayInInterval) => {
      const formattedDayKey = format(dayInInterval, "yyyy-MM-dd")
      const formattedDateLabel = format(dayInInterval, "MMM dd")
      return { Installs: countsByDay[formattedDayKey] || 0, date: formattedDateLabel }
    })
  }
  let osBreakdown: OsBreakdownDataPoint[] = []
  let osBreakdownErrorMessage: string | undefined
  const { data: osDataRpc, error: osErrorRpc } = await supabase.rpc("get_os_version_distribution", rpcParams)
  if (osErrorRpc) {
    console.error("Error fetching OS breakdown (RPC):", osErrorRpc.message)
    osBreakdownErrorMessage = "Could not load OS distribution."
  } else if (osDataRpc) {
    osBreakdown = osDataRpc.map((item: OsVersionRow) => ({
      Users: Number(item.user_count) || 0,
      name: `macOS ${item.os_version_name}`,
    }))
  }
  let cpuBreakdown: CpuBreakdownDataPoint[] = []
  let cpuBreakdownErrorMessage: string | undefined
  const { data: cpuDataRpc, error: cpuErrorRpc } = await supabase.rpc("get_cpu_architecture_distribution", rpcParams)
  if (cpuErrorRpc) {
    console.error("Error fetching CPU breakdown (RPC):", cpuErrorRpc.message)
    cpuBreakdownErrorMessage = "Could not load CPU architecture data."
  } else if (cpuDataRpc) {
    cpuBreakdown = cpuDataRpc.map((item: CpuArchRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.cpu_arch_name,
    }))
  }
  let topModels: TopModelsDataPoint[] = []
  let topModelsErrorMessage: string | undefined
  const { data: modelDataRpc, error: modelErrorRpc } = await supabase.rpc("get_top_models", {
    ...rpcParams,
    p_limit_count: 10,
  })
  if (modelErrorRpc) {
    console.error("Error fetching top models (RPC):", modelErrorRpc.message)
    topModelsErrorMessage = "Could not load top models data."
  } else if (modelDataRpc) {
    topModels = modelDataRpc.map((item: ModelRow) => ({
      count: Number(item.report_count) || 0,
      model: item.model_name,
    }))
  }
  // Language breakdown
  let languageBreakdown: LanguageDataPoint[] = []
  let languageBreakdownErrorMessage: string | undefined
  const { data: languageDataRpc, error: languageErrorRpc } = await supabase.rpc("get_language_distribution", {
    ...rpcParams,
    p_limit_count: 10,
  })
  if (languageErrorRpc) {
    console.error("Error fetching language breakdown (RPC):", languageErrorRpc.message)
    languageBreakdownErrorMessage = "Could not load language distribution."
  } else if (languageDataRpc) {
    languageBreakdown = languageDataRpc.map((item: LanguageRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.language_name,
    }))
  }

  // RAM breakdown
  let ramBreakdown: RamDataPoint[] = []
  let ramBreakdownErrorMessage: string | undefined
  const { data: ramDataRpc, error: ramErrorRpc } = await supabase.rpc("get_ram_distribution", rpcParams)
  if (ramErrorRpc) {
    console.error("Error fetching RAM breakdown (RPC):", ramErrorRpc.message)
    ramBreakdownErrorMessage = "Could not load RAM distribution."
  } else if (ramDataRpc) {
    ramBreakdown = ramDataRpc.map((item: RamRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.ram_gb,
    }))
  }

  // CPU cores breakdown
  let cpuCoresBreakdown: CpuCoresDataPoint[] = []
  let cpuCoresBreakdownErrorMessage: string | undefined
  const { data: cpuCoresDataRpc, error: cpuCoresErrorRpc } = await supabase.rpc("get_cpu_cores_distribution", rpcParams)
  if (cpuCoresErrorRpc) {
    console.error("Error fetching CPU cores breakdown (RPC):", cpuCoresErrorRpc.message)
    cpuCoresBreakdownErrorMessage = "Could not load CPU cores distribution."
  } else if (cpuCoresDataRpc) {
    cpuCoresBreakdown = cpuCoresDataRpc.map((item: CpuCoresRow) => ({
      Users: Number(item.user_count) || 0,
      name: item.core_count,
    }))
  }

  // Version adoption timeline
  let versionAdoption: VersionAdoptionDataPoint[] = []
  let versionAdoptionErrorMessage: string | undefined
  const { data: versionDataRpc, error: versionErrorRpc } = await supabase.rpc("get_version_adoption_timeline", {
    ...rpcParams,
    p_top_versions: 5,
  })
  if (versionErrorRpc) {
    console.error("Error fetching version adoption (RPC):", versionErrorRpc.message)
    versionAdoptionErrorMessage = "Could not load version adoption data."
  } else if (versionDataRpc) {
    // Transform data for multi-line chart
    const versionsByDate: { [date: string]: { [version: string]: number } } = {}
    const allVersions = new Set<string>()

    versionDataRpc.forEach((row: VersionAdoptionRow) => {
      const date = format(parseISO(row.report_date), "MMM dd")
      if (!versionsByDate[date]) {
        versionsByDate[date] = {}
      }
      versionsByDate[date][row.app_version] = Number(row.user_count) || 0
      allVersions.add(row.app_version)
    })

    versionAdoption = Object.entries(versionsByDate).map(([date, versions]) => {
      const dataPoint: VersionAdoptionDataPoint = { date }
      allVersions.forEach((version) => {
        dataPoint[version] = versions[version] || 0
      })
      return dataPoint
    })
  }

  // Hourly activity pattern (last 7 days)
  let hourlyActivity: HourlyActivityDataPoint[] = []
  let hourlyActivityErrorMessage: string | undefined
  const { data: hourlyDataRpc, error: hourlyErrorRpc } = await supabase.rpc("get_hourly_activity_pattern", {
    p_app_id_filter: rpcParams.p_app_id_filter,
    p_end_date_filter: queryTo.toISOString(),
    p_start_date_filter: startOfDay(subDays(new Date(), 6)).toISOString(),
  })
  if (hourlyErrorRpc) {
    console.error("Error fetching hourly activity (RPC):", hourlyErrorRpc.message)
    hourlyActivityErrorMessage = "Could not load activity pattern."
  } else if (hourlyDataRpc) {
    hourlyActivity = hourlyDataRpc.map((item: HourlyActivityRow) => ({
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const selectedAppId = typeof params?.app === "string" ? params.app : "all"
  let dateRange: DateRangeValue
  const defaultFrom = startOfDay(subDays(new Date(), 29))
  const defaultTo = startOfDay(new Date())
  if (typeof params?.from === "string") {
    const fromDate = parseISO(params.from)
    dateRange = { from: startOfDay(fromDate) }
    if (typeof params?.to === "string") {
      const toDate = parseISO(params.to)
      dateRange.to = startOfDay(toDate)
    } else {
      dateRange.to = defaultTo
    }
  } else {
    dateRange = { from: defaultFrom, to: defaultTo }
  }
  const data = await getDashboardData(selectedAppId, dateRange)
  const showInstallationsChart = !data.installs_timeseries_error && data.installs_timeseries.length > 0
  const showOsChart = !data.os_breakdown_error && data.os_breakdown.length > 0
  const showCpuChart = !data.cpu_breakdown_error && data.cpu_breakdown.length > 0
  const showTopModelsTable = !data.top_models_error && data.top_models.length > 0
  const showLanguageChart = !data.language_breakdown_error && data.language_breakdown.length > 0
  const showRamChart = !data.ram_breakdown_error && data.ram_breakdown.length > 0
  const showCpuCoresChart = !data.cpu_cores_breakdown_error && data.cpu_cores_breakdown.length > 0
  const showVersionAdoptionChart = !data.version_adoption_error && data.version_adoption.length > 0
  const showHourlyActivityChart = !data.hourly_activity_error && data.hourly_activity.length > 0
  const chartCardClassName = "rounded-lg bg-card text-card-foreground p-4 shadow-subtle border border-border"

  return (
    <main className="p-4 md:p-6 lg:p-8 mx-auto max-w-7xl bg-background text-foreground min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">
          stats.store - Fast, open, privacy-first analytics for Sparkle
        </h1>
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-center">
            <div className="h-10 bg-muted animate-pulse rounded-lg" />
            <div className="h-10 bg-muted animate-pulse rounded-lg" />
            <div className="h-10 bg-muted animate-pulse rounded-lg" />
          </div>
        }
      >
        <DashboardFilters
          apps={data.apps}
          currentAppId={selectedAppId}
          currentDateRange={dateRange}
          appsError={data.appsError}
        />
      </Suspense>
      {/* Real-time wrapper for managing state */}
      <RealtimeWrapper
        selectedAppId={selectedAppId}
        dateRange={{
          from: dateRange.from || defaultFrom,
          to: dateRange.to || defaultTo,
        }}
        initialData={{
          kpis: data.kpis,
          kpisError: data.kpisError,
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <KpiCard className={chartCardClassName}>
            <h2 className="text-card-foreground mb-1 font-medium">Installations Over Time</h2>
            {showInstallationsChart ? (
              <ClientLineChart
                className="mt-4 h-72" // Adjusted margin
                data={data.installs_timeseries}
                index="date"
                categories={["Installs"]}
                colors={["blue"]} // Uses chart-1
                yAxisWidth={48}
                showAnimation
              />
            ) : (
              <CardStatusDisplay
                error={data.installs_timeseries_error}
                noData={!data.installs_timeseries_error && data.installs_timeseries.length === 0}
                minHeightClassName="h-72"
              />
            )}
          </KpiCard>
          <KpiCard className={chartCardClassName}>
            <h2 className="text-card-foreground mb-1 font-medium">macOS Version Distribution</h2>
            {showOsChart ? (
              <ClientBarChart
                className="mt-4 h-72" // Adjusted margin
                data={data.os_breakdown}
                index="name"
                categories={["Users"]}
                colors={["teal"]} // Uses chart-2
                layout="vertical"
                yAxisWidth={120}
                showAnimation
              />
            ) : (
              <CardStatusDisplay
                error={data.os_breakdown_error}
                noData={!data.os_breakdown_error && data.os_breakdown.length === 0}
                minHeightClassName="h-72"
              />
            )}
          </KpiCard>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <KpiCard className={cn(chartCardClassName, "lg:col-span-1")}>
            <h2 className="text-card-foreground mb-1 font-medium">CPU Architecture</h2>
            {showCpuChart ? (
              <ClientDonutChart
                className="mt-4 h-56" // Adjusted margin
                data={data.cpu_breakdown}
                category="Users"
                index="name"
                colors={["cyan", "purple", "rose"]} // Example: chart-3, chart-5
                showAnimation
              />
            ) : (
              <CardStatusDisplay
                error={data.cpu_breakdown_error}
                noData={!data.cpu_breakdown_error && data.cpu_breakdown.length === 0}
                minHeightClassName="h-56"
              />
            )}
          </KpiCard>
          <KpiCard className={cn(chartCardClassName, "lg:col-span-2")}>
            <h2 className="text-card-foreground mb-1 font-medium">Top Models</h2>
            {showTopModelsTable ? (
              <Table className="mt-4 h-auto">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground">Model Identifier</TableHead>
                    <TableHead className="text-right text-muted-foreground">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top_models.map((item) => (
                    <TableRow key={item.model} className="text-card-foreground">
                      <TableCell>{item.model}</TableCell>
                      <TableCell className="text-right">{valueFormatter(item.count)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <CardStatusDisplay
                error={data.top_models_error}
                noData={!data.top_models_error && data.top_models.length === 0}
                minHeightClassName="h-[calc(theme(height.56)_+_theme(spacing.4))]"
              />
            )}
          </KpiCard>
        </div>

        {/* New charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <KpiCard className={chartCardClassName}>
            <h2 className="text-card-foreground mb-1 font-medium">Version Adoption Timeline</h2>
            {showVersionAdoptionChart ? (
              <ClientLineChart
                className="mt-4 h-72"
                data={data.version_adoption}
                index="date"
                categories={[
                  ...new Set(data.version_adoption.flatMap((d) => Object.keys(d).filter((k) => k !== "date"))),
                ]}
                colors={["blue", "teal", "cyan", "purple", "rose"]}
                yAxisWidth={48}
                showAnimation
              />
            ) : (
              <CardStatusDisplay
                error={data.version_adoption_error}
                noData={!data.version_adoption_error && data.version_adoption.length === 0}
                minHeightClassName="h-72"
              />
            )}
          </KpiCard>
          <KpiCard className={chartCardClassName}>
            <h2 className="text-card-foreground mb-1 font-medium">RAM Distribution</h2>
            {showRamChart ? (
              <ClientBarChart
                className="mt-4 h-72"
                data={data.ram_breakdown}
                index="name"
                categories={["Users"]}
                colors={["purple"]}
                layout="vertical"
                yAxisWidth={80}
                showAnimation
              />
            ) : (
              <CardStatusDisplay
                error={data.ram_breakdown_error}
                noData={!data.ram_breakdown_error && data.ram_breakdown.length === 0}
                minHeightClassName="h-72"
              />
            )}
          </KpiCard>
        </div>

        {/* New charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <KpiCard className={chartCardClassName}>
            <h2 className="text-card-foreground mb-1 font-medium">Language Distribution</h2>
            {showLanguageChart ? (
              <ClientDonutChart
                className="mt-4 h-56"
                data={data.language_breakdown}
                category="Users"
                index="name"
                colors={["blue", "teal", "cyan", "purple", "rose", "orange"]}
                showAnimation
              />
            ) : (
              <CardStatusDisplay
                error={data.language_breakdown_error}
                noData={!data.language_breakdown_error && data.language_breakdown.length === 0}
                minHeightClassName="h-56"
              />
            )}
          </KpiCard>
          <KpiCard className={chartCardClassName}>
            <h2 className="text-card-foreground mb-1 font-medium">CPU Core Count</h2>
            {showCpuCoresChart ? (
              <ClientBarChart
                className="mt-4 h-56"
                data={data.cpu_cores_breakdown}
                index="name"
                categories={["Users"]}
                colors={["teal"]}
                showAnimation
              />
            ) : (
              <CardStatusDisplay
                error={data.cpu_cores_breakdown_error}
                noData={!data.cpu_cores_breakdown_error && data.cpu_cores_breakdown.length === 0}
                minHeightClassName="h-56"
              />
            )}
          </KpiCard>
          <KpiCard className={chartCardClassName}>
            <h2 className="text-card-foreground mb-1 font-medium">Activity Pattern (UTC, Last 7 Days)</h2>
            {showHourlyActivityChart ? (
              <ClientLineChart
                className="mt-4 h-56"
                data={data.hourly_activity}
                index="hour"
                categories={["Activity"]}
                colors={["rose"]}
                yAxisWidth={40}
                showAnimation
              />
            ) : (
              <CardStatusDisplay
                error={data.hourly_activity_error}
                noData={!data.hourly_activity_error && data.hourly_activity.length === 0}
                minHeightClassName="h-56"
              />
            )}
          </KpiCard>
        </div>
      </RealtimeWrapper>

      <footer className="mt-12 py-6 text-center text-sm text-muted-foreground border-t border-border">
        Sparkle Statistics by{" "}
        <a
          href="https://twitter.com/steipete"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          @steipete
        </a>
        {" • "}
        <a
          href="https://github.com/steipete/stats-store"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          MIT Licensed
        </a>
        {" • "}
        <a
          href="https://steipete.me/posts/2025/stats-store-privacy-first-sparkle-analytics"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          Read the full story
        </a>
        <div className="mt-4">
          Want your free Mac app listed here?{" "}
          <a
            href="https://steipete.me/posts/2025/stats-store-privacy-first-sparkle-analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Learn how
          </a>
        </div>
      </footer>
    </main>
  )
}
