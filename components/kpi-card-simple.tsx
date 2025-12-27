import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

// Define props type for Heroicons
interface IconProps {
  className?: string
  "aria-hidden"?: boolean
}

interface KpiCardSimpleProps {
  title: string
  value: string | number
  icon: ComponentType<IconProps>
  iconColor?: string
  iconVariant?: "simple" | "light" | "shadow" | "solid" | "outline"
  error?: boolean
  errorIcon?: ComponentType<IconProps>
  tooltip?: string
}

export function KpiCardSimple({
  title,
  value,
  icon,
  iconColor = "blue",
  error = false,
  errorIcon,
  tooltip,
}: KpiCardSimpleProps) {
  const IconComponent = error && errorIcon ? errorIcon : icon
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

  return (
    <div
      title={tooltip}
      className={cn(
        "rounded-lg bg-card text-card-foreground p-4 shadow-subtle border border-border",
        tooltip ? "cursor-help" : ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-muted-foreground">{title}</div>
        <IconComponent className={cn("h-5 w-5 shrink-0", iconClassName)} aria-hidden />
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}
