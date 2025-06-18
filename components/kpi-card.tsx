"use client"

import {
  Card,
  Metric,
  Text,
  Flex,
  Icon,
} from "@tremor/react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UsersIcon, CubeTransparentIcon, TagIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline"

type IconName = "users" | "cube" | "tag" | "exclamation"

interface KpiCardProps {
  title: string
  value: string | number
  iconName: IconName
  iconColor?: string
  iconVariant?: "simple" | "light" | "shadow" | "solid" | "outline"
  error?: boolean
  tooltip?: string
}

export function KpiCard({
  title,
  value,
  iconName,
  iconColor = "blue",
  iconVariant = "light",
  error = false,
  tooltip,
}: KpiCardProps) {
  const iconMap = {
    users: UsersIcon,
    cube: CubeTransparentIcon,
    tag: TagIcon,
    exclamation: ExclamationCircleIcon,
  }
  
  const IconComponent = error ? ExclamationCircleIcon : iconMap[iconName]
  
  const cardContent = (
    <Card>
      <Flex alignItems="start">
        <Text>{title}</Text>
        <Icon
          icon={IconComponent}
          variant={error ? "simple" : iconVariant}
          color={error ? "rose" : iconColor}
          size="sm"
        />
      </Flex>
      <Metric className="mt-2">{value}</Metric>
    </Card>
  )

  if (!tooltip) {
    return cardContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}