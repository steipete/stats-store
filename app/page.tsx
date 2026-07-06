import { format, isValid, parseISO, startOfDay, subDays } from "date-fns";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CardStatusDisplay } from "@/components/card-status-display";
import { ChartCard } from "@/components/chart-card";
import { ClientBarChart } from "@/components/client-bar-chart";
import { ClientDonutChart } from "@/components/client-donut-chart";
import { ClientLineChart } from "@/components/client-line-chart";
import { DashboardFilters } from "@/components/dashboard-filters";
import { RealtimeWrapper } from "@/components/realtime-wrapper";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import type { DateRangeValue } from "@/lib/date-range";
import { valueFormatter } from "@/lib/formatters";

export const metadata: Metadata = {
  description:
    "View detailed statistics and analytics for your applications, including installations, user demographics, OS versions, CPU architectures, and top models. Make data-driven decisions.",
  title: "stats.store - Fast, open, privacy-first analytics for Sparkle",
};

function Wordmark() {
  return (
    <a href="/" className="group flex items-baseline gap-2">
      <span
        aria-hidden
        className="text-lg leading-none text-primary transition-transform duration-500 group-hover:rotate-45"
      >
        ✳
      </span>
      <span className="font-display text-xl italic tracking-tight text-foreground">
        stats<span className="text-muted-foreground">.</span>store
      </span>
    </a>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const appParam = typeof params?.app === "string" ? params.app : "all";
  const selectedAppId =
    appParam === "all" ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appParam)
      ? appParam
      : "all";
  const defaultFrom = startOfDay(subDays(new Date(), 29));
  const defaultTo = startOfDay(new Date());

  const fromParam = typeof params?.from === "string" ? parseISO(params.from) : undefined;
  const toParam = typeof params?.to === "string" ? parseISO(params.to) : undefined;
  const from = fromParam && isValid(fromParam) ? startOfDay(fromParam) : undefined;
  const to = toParam && isValid(toParam) ? startOfDay(toParam) : undefined;
  const baseDateRange: DateRangeValue =
    from || to
      ? {
          from: from ?? startOfDay(subDays(to ?? defaultTo, 29)),
          to: to ?? defaultTo,
        }
      : { from: defaultFrom, to: defaultTo };

  const dateRange =
    baseDateRange.from && baseDateRange.to && baseDateRange.from > baseDateRange.to
      ? { from: baseDateRange.to, to: baseDateRange.from }
      : baseDateRange;
  const data = await getDashboardData(selectedAppId, dateRange);
  const showInstallationsChart =
    !data.installs_timeseries_error && data.installs_timeseries.length > 0;
  const showOsChart = !data.os_breakdown_error && data.os_breakdown.length > 0;
  const showCpuChart = !data.cpu_breakdown_error && data.cpu_breakdown.length > 0;
  const showTopModelsTable = !data.top_models_error && data.top_models.length > 0;
  const showLanguageChart = !data.language_breakdown_error && data.language_breakdown.length > 0;
  const showRamChart = !data.ram_breakdown_error && data.ram_breakdown.length > 0;
  const showCpuCoresChart = !data.cpu_cores_breakdown_error && data.cpu_cores_breakdown.length > 0;
  const showVersionAdoptionChart = !data.version_adoption_error && data.version_adoption.length > 0;
  const showHourlyActivityChart = !data.hourly_activity_error && data.hourly_activity.length > 0;

  const rangeLabel =
    dateRange.from && dateRange.to
      ? `${format(dateRange.from, "MMM d")} — ${format(dateRange.to, "MMM d, yyyy")}`
      : "Last 30 days";

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          <Wordmark />
          <nav className="flex items-center gap-4">
            <a
              href="https://github.com/steipete/stats-store"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              GitHub
            </a>
            <a
              href="https://steipete.me/posts/2025/stats-store-privacy-first-sparkle-analytics"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Story
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 md:px-6 lg:px-8">
        <section className="pb-10 pt-12 md:pt-16">
          <p className="reveal text-[11px] uppercase tracking-[0.4em] text-primary">
            Sparkle telemetry · {rangeLabel}
          </p>
          <h1 className="reveal reveal-1 mt-4 max-w-3xl font-display text-[clamp(2.4rem,6vw,4.25rem)] font-light leading-[1.04] tracking-tight text-balance">
            Every Mac counted. <em className="italic text-primary">Nobody tracked.</em>
          </h1>
          <p className="reveal reveal-2 mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Privacy-first analytics for Sparkle-enabled Mac apps. No IP addresses stored, no
            fingerprints, no third parties — and free for open source.
          </p>
          <div className="reveal reveal-3 mt-10">
            <Suspense
              fallback={
                <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-2">
                  <div className="h-9 animate-pulse rounded-md bg-muted" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-9 animate-pulse rounded-md bg-muted" />
                    <div className="h-9 animate-pulse rounded-md bg-muted" />
                  </div>
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
          </div>
        </section>

        <div className="reveal reveal-4">
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <ChartCard
                num="01"
                title="Installations over time"
                note={rangeLabel}
                className="lg:col-span-12"
              >
                {showInstallationsChart ? (
                  <ClientLineChart
                    className="h-80"
                    data={data.installs_timeseries}
                    index="date"
                    categories={["Installs"]}
                    yAxisWidth={48}
                    showAnimation
                  />
                ) : (
                  <CardStatusDisplay
                    error={data.installs_timeseries_error}
                    noData={
                      !data.installs_timeseries_error && data.installs_timeseries.length === 0
                    }
                    minHeightClassName="h-80"
                  />
                )}
              </ChartCard>

              <ChartCard num="02" title="Version adoption" className="lg:col-span-7">
                {showVersionAdoptionChart ? (
                  <ClientLineChart
                    className="h-72"
                    data={data.version_adoption}
                    index="date"
                    categories={[
                      ...new Set(
                        data.version_adoption.flatMap((d) =>
                          Object.keys(d).filter((k) => k !== "date"),
                        ),
                      ),
                    ]}
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
              </ChartCard>

              <ChartCard num="03" title="macOS versions" className="lg:col-span-5">
                {showOsChart ? (
                  <ClientBarChart
                    className="h-72"
                    data={data.os_breakdown}
                    index="name"
                    categories={["Users"]}
                    layout="vertical"
                    yAxisWidth={110}
                    showAnimation
                  />
                ) : (
                  <CardStatusDisplay
                    error={data.os_breakdown_error}
                    noData={!data.os_breakdown_error && data.os_breakdown.length === 0}
                    minHeightClassName="h-72"
                  />
                )}
              </ChartCard>

              <ChartCard num="04" title="CPU architecture" className="lg:col-span-4">
                {showCpuChart ? (
                  <ClientDonutChart
                    className="h-64"
                    data={data.cpu_breakdown}
                    category="Users"
                    index="name"
                    showAnimation
                  />
                ) : (
                  <CardStatusDisplay
                    error={data.cpu_breakdown_error}
                    noData={!data.cpu_breakdown_error && data.cpu_breakdown.length === 0}
                    minHeightClassName="h-64"
                  />
                )}
              </ChartCard>

              <ChartCard num="05" title="Memory" note="RAM" className="lg:col-span-4">
                {showRamChart ? (
                  <ClientBarChart
                    className="h-64"
                    data={data.ram_breakdown}
                    index="name"
                    categories={["Users"]}
                    layout="vertical"
                    yAxisWidth={72}
                    showAnimation
                  />
                ) : (
                  <CardStatusDisplay
                    error={data.ram_breakdown_error}
                    noData={!data.ram_breakdown_error && data.ram_breakdown.length === 0}
                    minHeightClassName="h-64"
                  />
                )}
              </ChartCard>

              <ChartCard num="06" title="CPU cores" className="lg:col-span-4">
                {showCpuCoresChart ? (
                  <ClientBarChart
                    className="h-64"
                    data={data.cpu_cores_breakdown}
                    index="name"
                    categories={["Users"]}
                    showAnimation
                  />
                ) : (
                  <CardStatusDisplay
                    error={data.cpu_cores_breakdown_error}
                    noData={
                      !data.cpu_cores_breakdown_error && data.cpu_cores_breakdown.length === 0
                    }
                    minHeightClassName="h-64"
                  />
                )}
              </ChartCard>

              <ChartCard num="07" title="Top models" className="lg:col-span-6">
                {showTopModelsTable ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="h-9 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          Model identifier
                        </TableHead>
                        <TableHead className="h-9 text-right text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          Count
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.top_models.map((item) => (
                        <TableRow
                          key={item.model}
                          className="border-border/60 text-card-foreground hover:bg-accent/50"
                        >
                          <TableCell className="py-2.5 text-xs">{item.model}</TableCell>
                          <TableCell className="py-2.5 text-right text-xs tabular-nums">
                            {valueFormatter(item.count)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <CardStatusDisplay
                    error={data.top_models_error}
                    noData={!data.top_models_error && data.top_models.length === 0}
                    minHeightClassName="h-64"
                  />
                )}
              </ChartCard>

              <ChartCard num="08" title="Languages" className="lg:col-span-3">
                {showLanguageChart ? (
                  <ClientDonutChart
                    className="h-64"
                    data={data.language_breakdown}
                    category="Users"
                    index="name"
                    showAnimation
                  />
                ) : (
                  <CardStatusDisplay
                    error={data.language_breakdown_error}
                    noData={!data.language_breakdown_error && data.language_breakdown.length === 0}
                    minHeightClassName="h-64"
                  />
                )}
              </ChartCard>

              <ChartCard num="09" title="Activity" note="UTC · 7 days" className="lg:col-span-3">
                {showHourlyActivityChart ? (
                  <ClientLineChart
                    className="h-64"
                    data={data.hourly_activity}
                    index="hour"
                    categories={["Activity"]}
                    yAxisWidth={36}
                    showAnimation
                  />
                ) : (
                  <CardStatusDisplay
                    error={data.hourly_activity_error}
                    noData={!data.hourly_activity_error && data.hourly_activity.length === 0}
                    minHeightClassName="h-64"
                  />
                )}
              </ChartCard>
            </div>
          </RealtimeWrapper>
        </div>

        <footer className="mt-20 border-t border-border pt-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="font-display text-2xl italic tracking-tight">
                <span aria-hidden className="mr-2 not-italic text-primary">
                  ✳
                </span>
                stats.store
              </p>
              <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Open, privacy-first update analytics for Sparkle-enabled Mac apps.
              </p>
            </div>
            <div className="text-xs leading-loose text-muted-foreground">
              <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-foreground">
                Elsewhere
              </p>
              <a
                href="https://github.com/steipete/stats-store"
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-colors hover:text-primary"
              >
                GitHub · MIT licensed
              </a>
              <a
                href="https://twitter.com/steipete"
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-colors hover:text-primary"
              >
                @steipete
              </a>
              <a
                href="https://steipete.me/posts/2025/stats-store-privacy-first-sparkle-analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-colors hover:text-primary"
              >
                Read the full story
              </a>
            </div>
            <div className="text-xs leading-relaxed text-muted-foreground">
              <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-foreground">
                Get listed
              </p>
              <p>
                Building an open source Mac app? Hosting is free —{" "}
                <a
                  href="https://steipete.me/posts/2025/stats-store-privacy-first-sparkle-analytics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 transition-colors hover:underline"
                >
                  learn how
                </a>
                .
              </p>
            </div>
          </div>
          <p className="mt-10 pb-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
            No IPs · No fingerprints · No third parties
          </p>
        </footer>
      </main>
    </div>
  );
}
