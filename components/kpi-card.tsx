"use client"

import type React from "react"
import { Metric, Text, Flex, Icon as TremorIcon } from "@tremor/react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UsersIcon, CubeTransparentIcon, TagIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"

type IconName = "users" | "cube" | "tag" | "exclamation"

interface KpiCardProps {
  title?: string // Made title optional
  value?: string | number // Made value optional
  iconName?: IconName // Made iconName optional
  iconColor?: string
  iconVariant?: "simple" | "light" | "shadow" | "solid" | "outline"
  error?: boolean
  tooltip?: string
  children?: React.ReactNode
  className?: string
}

export function KpiCard({
  title,
  value,
  iconName,
  iconColor = "blue",
  iconVariant = "light",
  error = false,
  tooltip,
  children,
  className,
}: KpiCardProps) {
  const iconMap = {
    users: UsersIcon,
    cube: CubeTransparentIcon,
    tag: TagIcon,
    exclamation: ExclamationCircleIcon,
  }

  const IconComponent = iconName && (error ? ExclamationCircleIcon : iconMap[iconName])

  const cardContent = (
    <div
      className={cn(
        "rounded-lg bg-card text-card-foreground p-4 shadow-subtle border border-border",
        error ? "border-destructive/50" : "",
        className
      )}
    >
      {(title || iconName) && (
        <Flex alignItems="start" justifyContent="between">
          {title && <Text className="text-muted-foreground">{title}</Text>}
          {IconComponent &&
            iconName && ( // Check if IconComponent is valid before rendering TremorIcon
              <TremorIcon
                icon={IconComponent}
                variant={error ? "simple" : iconVariant}
                color={error ? "rose" : iconColor}
                size="sm"
                className={error ? "text-destructive" : ""} // Let Tremor handle the color
              />
            )}
        </Flex>
      )}
      {value && <Metric className={cn("text-foreground", title || iconName ? "mt-2" : "mt-0")}>{value}</Metric>}
      {children && <div className={cn(title || value || iconName ? "mt-4" : "")}>{children}</div>}
    </div>
  )

  if (!tooltip) {
    return cardContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent className="bg-tooltip text-tooltip-foreground rounded-md px-2 py-1 text-xs shadow-lg border border-border">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
