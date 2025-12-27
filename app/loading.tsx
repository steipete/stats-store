import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"

// Helper for skeleton styling
const SkeletonBox = ({ className = "" }: { className?: string }) => (
  <div className={cn("bg-muted animate-pulse rounded", className)} />
)

export default function Loading() {
  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">stats.store</h1>
      </div>

      {/* Filter Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center">
        <SkeletonBox className="h-10" />
        <SkeletonBox className="h-10" />
        <SkeletonBox className="h-10" />
      </div>

      {/* KPI Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-card text-card-foreground p-4 shadow-subtle border border-border">
            <SkeletonBox className="h-5 w-1/2 mb-2" />
            <SkeletonBox className="h-8 w-1/3" />
          </div>
        ))}
      </div>

      {/* Chart Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg bg-card text-card-foreground p-4 shadow-subtle border border-border">
          <SkeletonBox className="h-6 w-1/3 mb-4" />
          <SkeletonBox className="h-72" />
        </div>
        <div className="rounded-lg bg-card text-card-foreground p-4 shadow-subtle border border-border">
          <SkeletonBox className="h-6 w-1/3 mb-4" />
          <SkeletonBox className="h-72" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-lg bg-card text-card-foreground p-4 shadow-subtle border border-border lg:col-span-1">
          <SkeletonBox className="h-6 w-1/2 mb-4" />
          <SkeletonBox className="h-56" />
        </div>
        <div className="rounded-lg bg-card text-card-foreground p-4 shadow-subtle border border-border lg:col-span-2">
          <SkeletonBox className="h-6 w-1/2 mb-4" />
          <SkeletonBox className="h-56" />
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center justify-center">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
        <p className="mt-2 text-sm text-muted-foreground">Loading dashboard data...</p>
      </div>
    </main>
  )
}
