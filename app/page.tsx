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
import { UsersIcon, CubeTransparentIcon, TagIcon } from "@heroicons/react/24/outline"
import { subDays, format, startOfDay, eachDayOfInterval, parseISO } from "date-fns"
import { DashboardFilters } from "@/components/dashboard-filters"

// Helper function to format numbers
const valueFormatter = (number: number) => `${new Intl.NumberFormat("us").format(number).toString()}`

// Mock data for remaining charts
const mockTopModels = [
  { model: "MacBookPro17,1", count: Math.floor(Math.random() * 2500) + 500 },
  { model: "Macmini9,1", count: Math.floor(Math.random() * 2000) + 400 },
  { model: "MacBookAir10,1", count: Math.floor(Math.random() * 1800) + 300 },
  { model: "iMac21,1", count: Math.floor(Math.random() * 1500) + 200 },
  { model: "MacBookPro18,3", count: Math.floor(Math.random() * 1200) + 100 },
]

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

interface DashboardData {
  apps: App[]
  kpis: {
    unique_installs: number
    reports_this_period: number
    latest_version: string
  }
  installs_timeseries: TimeSeriesDataPoint[]
  os_breakdown: OsBreakdownDataPoint[]
  cpu_breakdown: CpuBreakdownDataPoint[]
  top_models: { model: string; count: number }[]
}

async function getDashboardData(
  selectedAppId: string | undefined,
  dateRange: DateRangePickerValue | undefined,
): Promise<DashboardData> {
  const supabase = createSupabaseServerClient()

  const { data: apps, error: appsError } = await supabase.from("apps").select("id, name").order("name")
  if (appsError) console.error("Error fetching apps:", appsError.message)

  const queryFrom = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(subDays(new Date(), 29))
  const queryTo = dateRange?.to ? startOfDay(dateRange.to) : startOfDay(new Date())
  const endOfDayTo = new Date(queryTo)
  endOfDayTo.setHours(23, 59, 59, 999)

  // --- KPI: Total Reports ---
  let totalInstallsQuery = supabase.from("reports").select("id", { count: "exact", head: true })
  if (selectedAppId && selectedAppId !== "all") {
    totalInstallsQuery = totalInstallsQuery.eq("app_id", selectedAppId)
  }
  totalInstallsQuery = totalInstallsQuery.gte("received_at", queryFrom.toISOString())
  totalInstallsQuery = totalInstallsQuery.lte("received_at", endOfDayTo.toISOString())
  const { count: totalReports, error: totalReportsError } = await totalInstallsQuery
  if (totalReportsError) console.error("Error fetching total reports:", totalReportsError.message)

  const activeReportsCount = totalReports

  // --- KPI: Latest Version Reported ---
  let latestVersion = "N/A"
  // ... (latest version logic remains the same)
  let latestVersionQuery = supabase
    .from("reports")
    .select("app_version")
    .not("app_version", "is", null)
    .order("received_at", { ascending: false })
    .limit(100)
  if (selectedAppId && selectedAppId !== "all") {
    latestVersionQuery = latestVersionQuery.eq("app_id", selectedAppId)
  }
  const { data: recentVersionsData, error: recentVersionsError } = await latestVersionQuery
  if (recentVersionsError) console.error("Error fetching recent versions:", recentVersionsError.message)
  if (recentVersionsData && recentVersionsData.length > 0) {
    const versions = recentVersionsData.map((r) => r.app_version).filter((v) => v) as string[]
    if (versions.length > 0) {
      versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }))
      latestVersion = versions[0]
    }
  }

  // --- Chart: Installations Over Time ---
  let installsTimeseries: TimeSeriesDataPoint[] = []
  // ... (installations over time logic remains the same)
  let reportsForChartQuery = supabase
    .from("reports")
    .select("received_at")
    .gte("received_at", queryFrom.toISOString())
    .lte("received_at", endOfDayTo.toISOString())
  if (selectedAppId && selectedAppId !== "all") {
    reportsForChartQuery = reportsForChartQuery.eq("app_id", selectedAppId)
  }
  const { data: reportsForChart, error: reportsForChartError } = await reportsForChartQuery
  if (reportsForChartError) {
    console.error("Error fetching reports for chart:", reportsForChartError.message)
  } else if (reportsForChart) {
    const countsByDay: { [key: string]: number } = {}
    reportsForChart.forEach((report) => {
      const day = format(startOfDay(parseISO(report.received_at)), "yyyy-MM-dd")
      countsByDay[day] = (countsByDay[day] || 0) + 1
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
  // ... (macOS version distribution logic remains the same)
  let osReportsQuery = supabase
    .from("reports")
    .select("os_version")
    .gte("received_at", queryFrom.toISOString())
    .lte("received_at", endOfDayTo.toISOString())
  if (selectedAppId && selectedAppId !== "all") {
    osReportsQuery = osReportsQuery.eq("app_id", selectedAppId)
  }
  const { data: osReports, error: osReportsError } = await osReportsQuery
  if (osReportsError) {
    console.error("Error fetching OS reports:", osReportsError.message)
  } else if (osReports) {
    const countsByOs: { [key: string]: number } = {}
    osReports.forEach((report) => {
      const osName = report.os_version ? `macOS ${report.os_version}` : "Unknown"
      countsByOs[osName] = (countsByOs[osName] || 0) + 1
    })
    osBreakdown = Object.entries(countsByOs)
      .map(([name, count]) => ({ name, Users: count }))
      .sort((a, b) => b.Users - a.Users)
  }

  // --- Chart: CPU Architecture ---
  let cpuBreakdown: CpuBreakdownDataPoint[] = []
  let cpuReportsQuery = supabase
    .from("reports")
    .select("cpu_arch")
    .gte("received_at", queryFrom.toISOString())
    .lte("received_at", endOfDayTo.toISOString())
  if (selectedAppId && selectedAppId !== "all") {
    cpuReportsQuery = cpuReportsQuery.eq("app_id", selectedAppId)
  }
  const { data: cpuReports, error: cpuReportsError } = await cpuReportsQuery
  if (cpuReportsError) {
    console.error("Error fetching CPU reports:", cpuReportsError.message)
  } else if (cpuReports) {
    const countsByCpu: { [key: string]: number } = {}
    cpuReports.forEach((report) => {
      let archName = "Unknown"
      if (report.cpu_arch === "arm64") {
        archName = "Apple Silicon"
      } else if (report.cpu_arch === "x86_64") {
        archName = "Intel"
      } else if (report.cpu_arch) {
        // Capture other non-null, non-standard values if any
        archName = report.cpu_arch
      }
      countsByCpu[archName] = (countsByCpu[archName] || 0) + 1
    })
    cpuBreakdown = Object.entries(countsByCpu)
      .map(([name, count]) => ({ name, Users: count }))
      .sort((a, b) => b.Users - a.Users)
  }

  return {
    apps: (apps || []) as App[],
    kpis: {
      unique_installs: totalReports ?? 0,
      reports_this_period: activeReportsCount ?? 0,
      latest_version: latestVersion,
    },
    installs_timeseries: installsTimeseries.length > 0 ? installsTimeseries : [],
    os_breakdown: osBreakdown.length > 0 ? osBreakdown : [],
    cpu_breakdown: cpuBreakdown.length > 0 ? cpuBreakdown : [],
    top_models: mockTopModels,
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

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl bg-background text-foreground min-h-screen">
      <Flex justifyContent="between" alignItems="center" className="mb-8">
        <Title className="text-3xl font-semibold">App Stats Store</Title>
      </Flex>

      <DashboardFilters apps={data.apps} currentAppId={selectedAppId} currentDateRange={dateRange} />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <Flex alignItems="start">
            <Text>Total Reports</Text>
            <Icon
              icon={UsersIcon}
              variant="light"
              tooltip={`Total reports received from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`}
              color="blue"
            />
          </Flex>
          <Metric className="mt-2">{valueFormatter(data.kpis.unique_installs)}</Metric>
        </Card>
        <Card>
          <Flex alignItems="start">
            <Text>Reports This Period</Text>
            <Icon
              icon={CubeTransparentIcon}
              variant="light"
              tooltip={`Reports received from ${format(dateRange.from!, "MMM dd, yyyy")} to ${format(dateRange.to!, "MMM dd, yyyy")}`}
              color="green"
            />
          </Flex>
          <Metric className="mt-2">{valueFormatter(data.kpis.reports_this_period)}</Metric>
        </Card>
        <Card>
          <Flex alignItems="start">
            <Text>Latest Version Reported</Text>
            <Icon
              icon={TagIcon}
              variant="light"
              tooltip="Highest reported application version (approximate)"
              color="amber"
            />
          </Flex>
          <Metric className="mt-2">{data.kpis.latest_version}</Metric>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <Title>Installations Over Time</Title>
          <LineChart
            className="mt-6 h-72"
            data={data.installs_timeseries}
            index="date"
            categories={["Installs"]}
            colors={["blue"]}
            valueFormatter={valueFormatter}
            yAxisWidth={48}
            showAnimation
            noDataText="No data for selected period."
          />
        </Card>
        <Card>
          <Title>macOS Version Distribution</Title>
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
            noDataText="No data for selected period."
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <Title>CPU Architecture</Title>
          <DonutChart
            className="mt-6 h-56"
            data={data.cpu_breakdown}
            category="Users"
            index="name"
            colors={["cyan", "indigo", "rose"]} // Added rose for "Unknown" or other values
            valueFormatter={valueFormatter}
            showAnimation
            noDataText="No data for selected period."
          />
        </Card>
        <Card className="lg:col-span-2">
          <Title>Top Models (Mock)</Title>
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
        </Card>
      </div>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        Powered by Sparkle, Next.js, Supabase, and Tremor.
      </footer>
    </main>
  )
}
