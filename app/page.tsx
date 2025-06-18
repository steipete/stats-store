import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  Card,
  Metric,
  Text,
  Flex,
  Title,
  Icon,
  // LineChart, BarChart, DonutChart, // Removed direct Tremor imports
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  type DateRangePickerValue,
} from "@tremor/react"
import { subDays, format, startOfDay, eachDayOfInterval, parseISO } from "date-fns"
import { DashboardFilters } from "@/components/dashboard-filters"
import type { Metadata } from "next"
import { valueFormatter } from "@/lib/formatters" // Still needed for KPIs and Table
import { CardStatusDisplay } from "@/components/card-status-display"
import { ClientLineChart } from "@/components/client-line-chart"
import { ClientBarChart } from "@/components/client-bar-chart"
import { ClientDonutChart } from "@/components/client-donut-chart"
import { KpiCard } from "@/components/kpi-card"

export const metadata: Metadata = {
  title: "App Stats Dashboard | Track Your Application Performance",
  description:
    "View detailed statistics and analytics for your applications, including installations, user demographics, OS versions, CPU architectures, and top models. Make data-driven decisions.",
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
}

async function getDashboardData(
  selectedAppIdParam: string | undefined,
  dateRange: DateRangePickerValue | undefined,
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
    p_start_date_filter: queryFrom.toISOString(),
    p_end_date_filter: queryTo.toISOString(),
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
    if (reportCountsError) throw reportCountsError
    reportsThisPeriodCount = count ?? 0
    uniqueInstallsCount = new Set(reportCountsData?.map((r) => r.ip_hash)).size
  } catch (e: any) {
    console.error("Error fetching KPI report counts:", e.message)
    kpiErrorMessage = "Could not load report counts."
    uniqueInstallsCount = "Error"
    reportsThisPeriodCount = "Error"
  }

  let latestVersionValue = "N/A"
  let latestVersionErrorMessage: string | undefined
  const { data: latestVersionDataRpc, error: latestVersionRpcError } = await supabase.rpc("get_latest_app_version", {
    app_id_filter: rpcParams.p_app_id_filter,
    start_date_filter: rpcParams.p_start_date_filter,
    end_date_filter: rpcParams.p_end_date_filter,
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
    start_date_filter: rpcParams.p_start_date_filter,
    end_date_filter: rpcParams.p_end_date_filter,
  })
  if (dailyCountsError) {
    console.error("Error fetching daily report counts (RPC):", dailyCountsError.message)
    installsTimeseriesErrorMessage = "Could not load installations data."
  } else if (dailyCountsData) {
    const countsByDay: { [key: string]: number } = {}
    dailyCountsData.forEach((row: any) => {
      countsByDay[row.report_day] = Number(row.report_count) || 0
    })
    const dateInterval = eachDayOfInterval({ start: queryFrom, end: queryTo })
    installsTimeseries = dateInterval.map((dayInInterval) => {
      const formattedDayKey = format(dayInInterval, "yyyy-MM-dd")
      const formattedDateLabel = format(dayInInterval, "MMM dd")
      return {
        date: formattedDateLabel,
        Installs: countsByDay[formattedDayKey] || 0,
      }
    })
  }

  let osBreakdown: OsBreakdownDataPoint[] = []
  let osBreakdownErrorMessage: string | undefined
  const { data: osDataRpc, error: osErrorRpc } = await supabase.rpc("get_os_version_distribution", rpcParams)
  if (osErrorRpc) {
    console.error("Error fetching OS breakdown (RPC):", osErrorRpc.message)
    osBreakdownErrorMessage = "Could not load OS distribution."
  } else if (osDataRpc) {
    osBreakdown = osDataRpc.map((item: any) => ({
      name: `macOS ${item.os_version_name}`,
      Users: Number(item.user_count) || 0,
    }))
  }

  let cpuBreakdown: CpuBreakdownDataPoint[] = []
  let cpuBreakdownErrorMessage: string | undefined
  const { data: cpuDataRpc, error: cpuErrorRpc } = await supabase.rpc("get_cpu_architecture_distribution", rpcParams)
  if (cpuErrorRpc) {
    console.error("Error fetching CPU breakdown (RPC):", cpuErrorRpc.message)
    cpuBreakdownErrorMessage = "Could not load CPU architecture data."
  } else if (cpuDataRpc) {
    cpuBreakdown = cpuDataRpc.map((item: any) => ({
      name: item.cpu_arch_name,
      Users: Number(item.user_count) || 0,
    }))
  }

  let topModels: TopModelsDataPoint[] = []
  let topModelsErrorMessage: string | undefined
  const { data: modelDataRpc, error: modelErrorRpc } = await supabase.rpc("get_top_models", {
    ...rpcParams,
    p_limit_count: 5,
  })
  if (modelErrorRpc) {
    console.error("Error fetching top models (RPC):", modelErrorRpc.message)
    topModelsErrorMessage = "Could not load top models data."
  } else if (modelDataRpc) {
    topModels = modelDataRpc.map((item: any) => ({
      model: item.model_name,
      count: Number(item.report_count) || 0,
    }))
  }

  return {
    apps: appsList,
    appsError: appsErrorMessage,
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
    installs_timeseries: installsTimeseries,
    installs_timeseries_error: installsTimeseriesErrorMessage,
    os_breakdown: osBreakdown,
    os_breakdown_error: osBreakdownErrorMessage,
    cpu_breakdown: cpuBreakdown,
    cpu_breakdown_error: cpuBreakdownErrorMessage,
    top_models: topModels,
    top_models_error: topModelsErrorMessage,
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const selectedAppId = typeof searchParams?.app === "string" ? searchParams.app : "all"
  let dateRange: DateRangePickerValue | undefined = undefined
  const defaultFrom = startOfDay(subDays(new Date(), 29))
  const defaultTo = startOfDay(new Date())

  if (typeof searchParams?.from === "string") {
    const fromDate = parseISO(searchParams.from)
    dateRange = { from: startOfDay(fromDate) }
    if (typeof searchParams?.to === "string") {
      const toDate = parseISO(searchParams.to)
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

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl bg-background text-foreground min-h-screen">
      <Flex justifyContent="between" alignItems="center" className="mb-8">
        <Title className="text-3xl font-semibold">stats.store</Title>
      </Flex>
      <DashboardFilters
        apps={data.apps}
        currentAppId={selectedAppId}
        currentDateRange={dateRange}
        appsError={data.appsError}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <KpiCard
          title="Unique Users"
          value={typeof data.kpis.unique_installs === "string"
            ? data.kpis.unique_installs
            : valueFormatter(data.kpis.unique_installs)}
          iconName="users"
          iconColor="blue"
          error={!!data.kpisError?.unique_installs}
          tooltip={`Unique users (based on IP hash) from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`}
        />
        <KpiCard
          title="Total Reports"
          value={typeof data.kpis.reports_this_period === "string"
            ? data.kpis.reports_this_period
            : valueFormatter(data.kpis.reports_this_period)}
          iconName="cube"
          iconColor="green"
          error={!!data.kpisError?.reports_this_period}
          tooltip={`Total reports received from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`}
        />
        <KpiCard
          title="Latest Version Reported"
          value={data.kpis.latest_version}
          iconName="tag"
          iconColor="amber"
          error={!!data.kpisError?.latest_version}
          tooltip="Highest reported application version (semantically sorted)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <Title>Installations Over Time</Title>
          {showInstallationsChart ? (
            <ClientLineChart
              className="mt-6 h-72"
              data={data.installs_timeseries}
              index="date"
              categories={["Installs"]}
              colors={["blue"]}
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
        </Card>
        <Card>
          <Title>macOS Version Distribution</Title>
          {showOsChart ? (
            <ClientBarChart
              className="mt-6 h-72"
              data={data.os_breakdown}
              index="name"
              categories={["Users"]}
              colors={["teal"]}
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
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <Title>CPU Architecture</Title>
          {showCpuChart ? (
            <ClientDonutChart
              className="mt-6 h-56"
              data={data.cpu_breakdown}
              category="Users"
              index="name"
              colors={["cyan", "indigo", "rose"]}
              showAnimation
            />
          ) : (
            <CardStatusDisplay
              error={data.cpu_breakdown_error}
              noData={!data.cpu_breakdown_error && data.cpu_breakdown.length === 0}
              minHeightClassName="h-56"
            />
          )}
        </Card>
        <Card className="lg:col-span-2">
          <Title>Top Models</Title>
          {showTopModelsTable ? (
            <Table className="mt-5 h-0">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Model Identifier</TableHeaderCell>
                  <TableHeaderCell className="text-right">Count</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.top_models.map((item) => (
                  <TableRow key={item.model}>
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
              minHeightClassName="h-0"
            />
          )}
        </Card>
      </div>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
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
      </footer>
    </main>
  )
}
