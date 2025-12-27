import { isValid, parseISO, startOfDay, subDays } from "date-fns"
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
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data"
import type { DateRangeValue } from "@/lib/date-range"
import { valueFormatter } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  description:
    "View detailed statistics and analytics for your applications, including installations, user demographics, OS versions, CPU architectures, and top models. Make data-driven decisions.",
  title: "stats.store - Fast, open, privacy-first analytics for Sparkle",
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const appParam = typeof params?.app === "string" ? params.app : "all"
  const selectedAppId =
    appParam === "all" || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appParam)
      ? appParam
      : "all"
  const defaultFrom = startOfDay(subDays(new Date(), 29))
  const defaultTo = startOfDay(new Date())

  const fromParam = typeof params?.from === "string" ? parseISO(params.from) : undefined
  const toParam = typeof params?.to === "string" ? parseISO(params.to) : undefined
  const from = fromParam && isValid(fromParam) ? startOfDay(fromParam) : undefined
  const to = toParam && isValid(toParam) ? startOfDay(toParam) : undefined
  const baseDateRange: DateRangeValue =
    from || to
      ? {
          from: from ?? startOfDay(subDays(to ?? defaultTo, 29)),
          to: to ?? defaultTo,
        }
      : { from: defaultFrom, to: defaultTo }

  const dateRange =
    baseDateRange.from && baseDateRange.to && baseDateRange.from > baseDateRange.to
      ? { from: baseDateRange.to, to: baseDateRange.from }
      : baseDateRange
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
