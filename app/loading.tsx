import { Card, Flex, Title, Text } from "@tremor/react"
import { ArrowPathIcon } from "@heroicons/react/24/outline" // For a spinner icon

// Helper for skeleton styling
const SkeletonBox = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gray-200 dark:bg-gray-700 animate-pulse rounded ${className}`} />
)

export default function Loading() {
  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl min-h-screen">
      <Flex justifyContent="between" alignItems="center" className="mb-8">
        <Title className="text-3xl font-semibold">stats.store</Title>
      </Flex>

      {/* Filter Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center">
        <SkeletonBox className="h-10" />
        <SkeletonBox className="h-10" />
        <SkeletonBox className="h-10" />
      </div>

      {/* KPI Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <SkeletonBox className="h-5 w-1/2 mb-2" />
            <SkeletonBox className="h-8 w-1/3" />
          </Card>
        ))}
      </div>

      {/* Chart Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <SkeletonBox className="h-6 w-1/3 mb-4" />
          <SkeletonBox className="h-72" />
        </Card>
        <Card>
          <SkeletonBox className="h-6 w-1/3 mb-4" />
          <SkeletonBox className="h-72" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <SkeletonBox className="h-6 w-1/2 mb-4" />
          <SkeletonBox className="h-56" />
        </Card>
        <Card className="lg:col-span-2">
          <SkeletonBox className="h-6 w-1/2 mb-4" />
          <SkeletonBox className="h-56" />
        </Card>
      </div>

      <Flex className="mt-12 items-center justify-center" flexDirection="col">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
        <Text className="mt-2 text-gray-500 dark:text-gray-400">Loading dashboard data...</Text>
      </Flex>
    </main>
  )
}
