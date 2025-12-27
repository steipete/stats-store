"use client"

import { CubeTransparentIcon, ExclamationCircleIcon, TagIcon, UsersIcon } from "@heroicons/react/24/outline"
import type React from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  error = false,
  tooltip,
  children,
  className,
}: KpiCardProps) {
  const iconMap = {
    cube: CubeTransparentIcon,
    exclamation: ExclamationCircleIcon,
    tag: TagIcon,
    users: UsersIcon,
  }

  const IconComponent = iconName && (error ? ExclamationCircleIcon : iconMap[iconName])

  const iconClassName = error
    ? "text-destructive"
    : iconColor === "green"
      ? "text-emerald-500"
      : iconColor === "amber"
        ? "text-amber-500"
        : iconColor === "teal"
          ? "text-teal-500"
          : iconColor === "purple"
            ? "text-purple-500"
            : iconColor === "rose"
              ? "text-rose-500"
              : "text-blue-500"

  const cardContent = (
    <div
      className={cn(
        "rounded-lg bg-card text-card-foreground p-4 shadow-subtle border border-border",
        error ? "border-destructive/50" : "",
        className
      )}
    >
      {(title || iconName) && (
        <div className="flex items-start justify-between gap-3">
          {title && <p className="text-sm text-muted-foreground">{title}</p>}
          {IconComponent && iconName ? <IconComponent className={cn("h-5 w-5 shrink-0", iconClassName)} /> : null}
        </div>
      )}
      {value ? (
        <div className={cn("text-2xl font-semibold text-foreground", title || iconName ? "mt-2" : "mt-0")}>{value}</div>
      ) : null}
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
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
