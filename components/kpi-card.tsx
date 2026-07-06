"use client";

import {
  CubeTransparentIcon,
  ExclamationCircleIcon,
  TagIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type IconName = "users" | "cube" | "tag" | "exclamation";

interface KpiCardProps {
  title?: string;
  value?: string | number;
  iconName?: IconName;
  iconColor?: string;
  iconVariant?: "simple" | "light" | "shadow" | "solid" | "outline";
  error?: boolean;
  tooltip?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * KPI cell in the hairline-divided stats band: quiet uppercase label,
 * oversized tabular numeral. Icons stay muted; error turns destructive.
 */
export function KpiCard({
  title,
  value,
  iconName,
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
  };

  const IconComponent = iconName && (error ? ExclamationCircleIcon : iconMap[iconName]);

  const cardContent = (
    <div
      className={cn(
        "relative bg-transparent px-1 py-6 md:px-7 md:py-8",
        error ? "text-destructive" : "text-foreground",
        className,
      )}
    >
      {(title || iconName) && (
        <div className="flex items-center justify-between gap-3">
          {title && (
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{title}</p>
          )}
          {IconComponent && iconName ? (
            <IconComponent
              className={cn(
                "h-4 w-4 shrink-0",
                error ? "text-destructive" : "text-muted-foreground/60",
              )}
            />
          ) : null}
        </div>
      )}
      {value ? (
        <div
          className={cn(
            "font-light tabular-nums tracking-tight",
            "text-4xl md:text-[3.4rem] md:leading-[1.1]",
            title || iconName ? "mt-3" : "mt-0",
          )}
        >
          {value}
        </div>
      ) : null}
      {children && <div className={cn(title || value || iconName ? "mt-4" : "")}>{children}</div>}
    </div>
  );

  if (!tooltip) {
    return cardContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
