"use client"

import {
  Card,
  Metric,
  Text,
  Flex,
  Icon,
} from "@tremor/react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ComponentType } from "react"

interface KpiCardProps {
  title: string
  value: string | number
  icon: ComponentType<any>
  iconColor?: string
  iconVariant?: "simple" | "light" | "shadow" | "solid" | "outline"
  error?: boolean
  errorIcon?: ComponentType<any>
  tooltip?: string
}

export function KpiCard({
  title,
  value,
  icon,
  iconColor = "blue",
  iconVariant = "light",
  error = false,
  errorIcon,
  tooltip,
}: KpiCardProps) {
  const cardContent = (
    <Card>
      <Flex alignItems="start">
        <Text>{title}</Text>
        {error && errorIcon ? (
          <Icon icon={errorIcon} color="rose" size="sm" />
        ) : (
          <Icon
            icon={icon}
            variant={iconVariant}
            color={iconColor}
            size="sm"
          />
        )}
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