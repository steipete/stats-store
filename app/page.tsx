import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  Card,
  Metric,
  Text,
  Flex,
  Title,
  Icon,
  LineChart,
  BarChart,
  DonutChart,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  type DateRangePickerValue,
} from "@tremor/react"
import {
  UsersIcon,
  CubeTransparentIcon,
  TagIcon,
  ExclamationCircleIcon,
  ChartBarIcon, // For no data state
} from "@heroicons/react/24/outline"
import { subDays, format, startOfDay, eachDayOfInterval, parseISO } from "date-fns"
import { DashboardFilters } from "@/components/dashboard-filters"

// Helper function to format numbers
const valueFormatter = (number: number) => `${new Intl.NumberFormat("us").format(number).toString()}`

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

// Helper component for displaying status within cards (Error or No Data)
const CardStatusDisplay = ({
  error,
  noData,
  minHeightClassName,
  noDataMessage = "No data for selected period.",
}: {
  error?: string
  noData?: boolean
  minHeightClassName: string
  noDataMessage?: string
}) => {
  if (error) {
    return (
      <Flex className={`${minHeightClassName} items-center justify-center p-4`} flexDirection="col">
        <Icon icon={ExclamationCircleIcon} color="rose" variant="light" size="lg" />
        <Text className="mt-2 text-center" color="rose">
          {error}
        </Text>
      </Flex>
    )
  }
  if (noData) {
    return (
      <Flex className={`${minHeightClassName} items-center justify-center p-4`} flexDirection="col">
        <Icon icon={ChartBarIcon} color="gray" variant="light" size="lg" />
        <Text className="mt-2 text-center text-gray-500">{noDataMessage}</Text>
      </Flex>
    )
  }
  return null
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

  const rpcStartDate = queryFrom.toISOString()
  const rpcEndDate = queryTo.toISOString()
  const rpcAppId = selectedAppIdParam && selectedAppIdParam !== "all" ? selectedAppIdParam : null

  const endOfDayToForNonRpcQueries = new Date(queryTo)
  endOfDayToForNonRpcQueries.setHours(23, 59, 59, 999)

  // --- KPI: Total Reports ---
  let totalReportsCount: number | string = 0
  let totalReportsErrorMessage: string | undefined
  let totalInstallsQuery = supabase.from("reports").select("id", { count: "exact", head: true })
  if (selectedAppIdParam && selectedAppIdParam !== "all") {
    totalInstallsQuery = totalInstallsQuery.eq("app_id", selectedAppIdParam)
  }
  totalInstallsQuery = totalInstallsQuery.gte("received_at", queryFrom.toISOString())
  totalInstallsQuery = totalInstallsQuery.lte("received_at", endOfDayToForNonRpcQueries.toISOString())

  const { count: totalReportsData, error: totalReportsError } = await totalInstallsQuery
  if (totalReportsError) {
    console.error("Error fetching total reports:", totalReportsError.message)
    totalReportsErrorMessage = "Could not load total reports."
    totalReportsCount = "Error"
  } else {
    totalReportsCount = totalReportsData ?? 0
  }
  const activeReportsCount = totalReportsCount

  // --- KPI: Latest Version Reported (using RPC) ---
  let latestVersionValue = "N/A"
  let latestVersionErrorMessage: string | undefined
  const { data: latestVersionDataRpc, error: latestVersionRpcError } = await supabase.rpc("get_latest_app_version", {
    app_id_filter: rpcAppId,
    start_date_filter: rpcStartDate,
    end_date_filter: rpcEndDate,
  })

  if (latestVersionRpcError) {
    console.error("Error fetching latest app version:", latestVersionRpcError.message)
    latestVersionErrorMessage = "Could not load latest version."
    latestVersionValue = "Error"
  } else if (latestVersionDataRpc) {
    latestVersionValue = latestVersionDataRpc
  } else {
    latestVersionValue = "N/A"
  }

  // --- Chart: Installations Over Time (using RPC) ---
  let installsTimeseries: TimeSeriesDataPoint[] = []
  let installsTimeseriesErrorMessage: string | undefined
  const { data: dailyCountsData, error: dailyCountsError } = await supabase.rpc("get_daily_report_counts", {
    app_id_filter: rpcAppId,
    start_date_filter: rpcStartDate,
    end_date_filter: rpcEndDate,
  })

  if (dailyCountsError) {
    console.error("Error fetching daily report counts:", dailyCountsError.message)
    installsTimeseriesErrorMessage = "Could not load installations data."
  } else if (dailyCountsData) {
    const countsByDay: { [key: string]: number } = {}
    dailyCountsData.forEach((row: { report_day: string; report_count: number }) => {
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

  // --- Chart: macOS Version Distribution ---
  let osBreakdown: OsBreakdownDataPoint[] = []
  let osBreakdownErrorMessage: string | undefined
  let osBreakdownQuery = supabase
    .from("reports")
    .select("os_version, count:id(count)")
    .gte("received_at", queryFrom.toISOString())
    .lte("received_at", endOfDayToForNonRpcQueries.toISOString())
  if (selectedAppIdParam && selectedAppIdParam !== "all") {
    osBreakdownQuery = osBreakdownQuery.eq("app_id", selectedAppIdParam)
  }
  const { data: osData, error: osError } = await osBreakdownQuery
    .group("os_version")
    .order("count", { ascending: false })
  if (osError) {
    console.error("Error fetching OS breakdown:", osError.message)
    osBreakdownErrorMessage = "Could not load OS distribution."
  } else if (osData) {
    osBreakdown = osData.map((item) => ({
      name: item.os_version ? `macOS ${item.os_version}` : "Unknown",
      Users: item.count || 0,
    }))
  }

  // --- Chart: CPU Architecture ---
  let cpuBreakdown: CpuBreakdownDataPoint[] = []
  let cpuBreakdownErrorMessage: string | undefined
  let cpuBreakdownQuery = supabase
    .from("reports")
    .select("cpu_arch, count:id(count)")
    .gte("received_at", queryFrom.toISOString())
    .lte("received_at", endOfDayToForNonRpcQueries.toISOString())
  if (selectedAppIdParam && selectedAppIdParam !== "all") {
    cpuBreakdownQuery = cpuBreakdownQuery.eq("app_id", selectedAppIdParam)
  }
  const { data: cpuData, error: cpuError } = await cpuBreakdownQuery
    .group("cpu_arch")
    .order("count", { ascending: false })
  if (cpuError) {
    console.error("Error fetching CPU breakdown:", cpuError.message)
    cpuBreakdownErrorMessage = "Could not load CPU architecture data."
  } else if (cpuData) {
    cpuBreakdown = cpuData.map((item) => {
      let archName = "Unknown"
      if (item.cpu_arch === "arm64") archName = "Apple Silicon"
      else if (item.cpu_arch === "x86_64") archName = "Intel"
      else if (item.cpu_arch) archName = item.cpu_arch
      return { name: archName, Users: item.count || 0 }
    })
  }

  // --- Table: Top Models ---
  let topModels: TopModelsDataPoint[] = []
  let topModelsErrorMessage: string | undefined
  let topModelsQuery = supabase
    .from("reports")
    .select("model_identifier, count:id(count)")
    .gte("received_at", queryFrom.toISOString())
    .lte("received_at", endOfDayToForNonRpcQueries.toISOString())
  if (selectedAppIdParam && selectedAppIdParam !== "all") {
    topModelsQuery = topModelsQuery.eq("app_id", selectedAppIdParam)
  }
  const { data: modelData, error: modelError } = await topModelsQuery
    .group("model_identifier")
    .order("count", { ascending: false })
    .limit(5)
  if (modelError) {
    console.error("Error fetching top models:", modelError.message)
    topModelsErrorMessage = "Could not load top models data."
  } else if (modelData) {
    topModels = modelData.map((item) => ({
      model: item.model_identifier || "Unknown",
      count: item.count || 0,
    }))
  }

  return {
    apps: appsList,
    appsError: appsErrorMessage,
    kpis: {
      unique_installs: totalReportsCount,
      reports_this_period: activeReportsCount,
      latest_version: latestVersionValue,
    },
    kpisError: {
      unique_installs: totalReportsErrorMessage,
      reports_this_period: totalReportsErrorMessage,
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

  const renderKpiMetric = (value: number | string) => {
    if (typeof value === "string") return value
    return valueFormatter(value)
  }

  const showInstallationsChart = !data.installs_timeseries_error && data.installs_timeseries.length > 0
  const showOsChart = !data.os_breakdown_error && data.os_breakdown.length > 0
  const showCpuChart = !data.cpu_breakdown_error && data.cpu_breakdown.length > 0
  const showTopModelsTable = !data.top_models_error && data.top_models.length > 0

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl bg-background text-foreground min-h-screen">
      <Flex justifyContent="between" alignItems="center" className="mb-8">
        <Title className="text-3xl font-semibold">App Stats Store</Title>
      </Flex>

      <DashboardFilters
        apps={data.apps}
        currentAppId={selectedAppId}
        currentDateRange={dateRange}
        appsError={data.appsError}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <Flex alignItems="start">
            <Text>Total Reports</Text>
            {data.kpisError?.unique_installs ? (
              <Icon icon={ExclamationCircleIcon} color="rose" tooltip={data.kpisError.unique_installs} size="sm" />
            ) : (
              <Icon
                icon={UsersIcon}
                variant="light"
                tooltip={`Total reports received from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`}
                color="blue"
                size="sm"
              />
            )}
          </Flex>
          <Metric className="mt-2">{renderKpiMetric(data.kpis.unique_installs)}</Metric>
        </Card>
        <Card>
          <Flex alignItems="start">
            <Text>Reports This Period</Text>
            {data.kpisError?.reports_this_period ? (
              <Icon icon={ExclamationCircleIcon} color="rose" tooltip={data.kpisError.reports_this_period} size="sm" />
            ) : (
              <Icon
                icon={CubeTransparentIcon}
                variant="light"
                tooltip={`Reports received from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`}
                color="green"
                size="sm"
              />
            )}
          </Flex>
          <Metric className="mt-2">{renderKpiMetric(data.kpis.reports_this_period)}</Metric>
        </Card>
        <Card>
          <Flex alignItems="start">
            <Text>Latest Version Reported</Text>
            {data.kpisError?.latest_version ? (
              <Icon icon={ExclamationCircleIcon} color="rose" tooltip={data.kpisError.latest_version} size="sm" />
            ) : (
              <Icon
                icon={TagIcon}
                variant="light"
                tooltip="Highest reported application version (semantically sorted)"
                color="amber"
                size="sm"
              />
            )}
          </Flex>
          <Metric className="mt-2">{data.kpis.latest_version}</Metric>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <Title>Installations Over Time</Title>
          {showInstallationsChart ? (
            <LineChart
              className="mt-6 h-72"
              data={data.installs_timeseries}
              index="date"
              categories={["Installs"]}
              colors={["blue"]}
              valueFormatter={valueFormatter}
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
            <BarChart
              className="mt-6 h-72"
              data={data.os_breakdown}
              index="name"
              categories={["Users"]}
              colors={["teal"]}
              valueFormatter={valueFormatter}
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
            <DonutChart
              className="mt-6 h-56"
              data={data.cpu_breakdown}
              category="Users"
              index="name"
              colors={["cyan", "indigo", "rose"]}
              valueFormatter={valueFormatter}
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
            <Table className="mt-5 h-[calc(theme(height.56)_+_theme(spacing.5))]">
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
              minHeightClassName="h-[calc(theme(height.56)_+_theme(spacing.5))]"
            />
          )}
        </Card>
      </div>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        Powered by Sparkle, Next.js, Supabase, and Tremor.
      </footer>
    </main>
  )
}
