import { cn } from "@/lib/utils";

const SkeletonBox = ({ className = "" }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-md bg-muted", className)} />
);

const SkeletonPanel = ({
  className = "",
  bodyClassName = "h-64",
}: {
  className?: string;
  bodyClassName?: string;
}) => (
  <div className={cn("rounded-lg border border-border bg-card/70 p-5", className)}>
    <SkeletonBox className="mb-4 h-4 w-1/3" />
    <SkeletonBox className={bodyClassName} />
  </div>
);

export default function Loading() {
  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          <p className="font-display text-xl italic tracking-tight text-foreground">
            <span aria-hidden className="mr-2 not-italic text-primary">
              ✳
            </span>
            stats<span className="text-muted-foreground">.</span>store
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 md:px-6 lg:px-8">
        <section className="pb-10 pt-12 md:pt-16">
          <SkeletonBox className="h-3 w-56" />
          <SkeletonBox className="mt-5 h-14 w-full max-w-2xl" />
          <SkeletonBox className="mt-5 h-4 w-full max-w-md" />
          <div className="mt-10 grid grid-cols-1 items-center gap-3 md:grid-cols-2">
            <SkeletonBox className="h-9" />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonBox className="h-9" />
              <SkeletonBox className="h-9" />
            </div>
          </div>
        </section>

        {/* KPI band skeleton */}
        <div className="mb-12 grid grid-cols-1 divide-y divide-border border-y border-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-1 py-6 md:px-7 md:py-8">
              <SkeletonBox className="h-3 w-1/2" />
              <SkeletonBox className="mt-4 h-12 w-2/3" />
            </div>
          ))}
        </div>

        {/* Chart grid skeleton */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <SkeletonPanel className="lg:col-span-12" bodyClassName="h-80" />
          <SkeletonPanel className="lg:col-span-7" bodyClassName="h-72" />
          <SkeletonPanel className="lg:col-span-5" bodyClassName="h-72" />
          <SkeletonPanel className="lg:col-span-4" />
          <SkeletonPanel className="lg:col-span-4" />
          <SkeletonPanel className="lg:col-span-4" />
        </div>

        <p className="mt-12 text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Loading dashboard data…
        </p>
      </main>
    </div>
  );
}
