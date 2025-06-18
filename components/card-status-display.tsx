"use client"

import { Flex, Icon, Text } from "@tremor/react"
import { ExclamationCircleIcon, ChartBarIcon } from "@heroicons/react/24/outline"

interface CardStatusDisplayProps {
  error?: string
  noData?: boolean
  minHeightClassName: string
  noDataMessage?: string
}

export const CardStatusDisplay = ({
  error,
  noData,
  minHeightClassName,
  noDataMessage = "No data for selected period.",
}: CardStatusDisplayProps) => {
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
