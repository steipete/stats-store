import {
  Card,
  Metric,
  Text,
  Flex,
  Icon,
} from "@tremor/react"
import type { ComponentType } from "react"

interface KpiCardSimpleProps {
  title: string
  value: string | number
  icon: ComponentType<any>
  iconColor?: string
  iconVariant?: "simple" | "light" | "shadow" | "solid" | "outline"
  error?: boolean
  errorIcon?: ComponentType<any>
  tooltip?: string
}

export function KpiCardSimple({
  title,
  value,
  icon,
  iconColor = "blue",
  iconVariant = "light",
  error = false,
  errorIcon,
  tooltip,
}: KpiCardSimpleProps) {
  return (
    <Card title={tooltip} className="cursor-help">
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
}
