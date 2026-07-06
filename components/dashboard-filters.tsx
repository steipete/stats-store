"use client";

import {
  ChevronDownIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { format, parseISO, startOfDay } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { DateRangeValue } from "@/lib/date-range";
import { cn } from "@/lib/utils";

interface App {
  id: string;
  name: string;
}

interface DashboardFiltersProps {
  apps: App[] | null;
  currentAppId: string;
  currentDateRange?: DateRangeValue;
  appsError?: string;
}

export function DashboardFilters({
  apps: initialApps,
  currentAppId,
  currentDateRange,
  appsError,
}: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const apps = initialApps || [];

  const derivedFrom = currentDateRange?.from ? format(currentDateRange.from, "yyyy-MM-dd") : "";
  const derivedTo = currentDateRange?.to ? format(currentDateRange.to, "yyyy-MM-dd") : derivedFrom;

  const [fromValue, setFromValue] = useState(() => derivedFrom);
  const [toValue, setToValue] = useState(() => derivedTo);

  useEffect(() => {
    setFromValue(derivedFrom);
    setToValue(derivedTo);
  }, [derivedFrom, derivedTo]);

  const handleAppChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      newParams.delete("app");
    } else {
      newParams.set("app", value);
    }
    router.push(`/?${newParams.toString()}`);
  };

  const pushDateRange = (nextFrom: string, nextTo: string) => {
    const from = startOfDay(parseISO(nextFrom));
    const to = startOfDay(parseISO(nextTo));
    handleDateChange({ from, to });
  };

  const handleDateChange = (value: DateRangeValue | undefined) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value?.from) {
      newParams.set("from", format(startOfDay(value.from), "yyyy-MM-dd"));
      if (value.to) {
        newParams.set("to", format(startOfDay(value.to), "yyyy-MM-dd"));
      } else {
        // If only 'from' is selected, set 'to' to the same day for a single-day range
        newParams.set("to", format(startOfDay(value.from), "yyyy-MM-dd"));
      }
    } else {
      newParams.delete("from");
      newParams.delete("to");
    }
    router.push(`/?${newParams.toString()}`);
  };

  const commonInputBaseClasses =
    "w-full h-9 rounded-md bg-input text-foreground text-sm border border-input-border focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-colors duration-150 ease-in-out";
  const commonErrorWarningClasses =
    "flex items-center space-x-2 px-2.5 border rounded-md h-9 text-xs";

  const renderAppFilter = () => {
    if (appsError) {
      return (
        <div
          className={cn(
            commonErrorWarningClasses,
            "border-destructive/50 bg-destructive/10 text-destructive rounded-lg",
          )}
        >
          <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
          <span className="truncate">{appsError}</span>
        </div>
      );
    }

    const selectValue = currentAppId || "all";
    const options = [{ id: "all", name: "All Apps" }, ...apps];

    if (options.length === 0 && !appsError) {
      return (
        <div
          className={cn(
            commonErrorWarningClasses,
            "border-muted bg-muted/20 text-muted-foreground rounded-lg",
          )}
        >
          <InformationCircleIcon className="h-5 w-5 shrink-0" />
          <span className="truncate">No applications found.</span>
        </div>
      );
    }

    return (
      <div
        className={cn("relative flex w-full items-center overflow-hidden", commonInputBaseClasses)}
      >
        <span className="pointer-events-none pl-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          App
        </span>
        <select
          value={selectValue}
          onChange={(e) => handleAppChange(e.target.value)}
          className="h-full w-full appearance-none bg-transparent py-0 pl-3 pr-9 text-foreground focus:outline-none"
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id} className="text-foreground bg-popover">
              {opt.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
      {renderAppFilter()}
      <div className="grid grid-cols-2 gap-3">
        <div className={cn(commonInputBaseClasses, "px-3 flex items-center gap-3")}>
          <span className="pointer-events-none text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            From
          </span>
          <label className="sr-only" htmlFor="date-from">
            From
          </label>
          <input
            id="date-from"
            type="date"
            className="w-full bg-transparent text-foreground focus:outline-none"
            value={fromValue}
            onChange={(e) => {
              const nextFrom = e.target.value;
              if (!nextFrom) {
                setFromValue("");
                setToValue("");
                handleDateChange(undefined);
                return;
              }

              const nextTo = toValue || nextFrom;
              setFromValue(nextFrom);
              setToValue(nextTo);
              pushDateRange(nextFrom, nextTo);
            }}
          />
        </div>
        <div className={cn(commonInputBaseClasses, "px-3 flex items-center gap-3")}>
          <span className="pointer-events-none text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            To
          </span>
          <label className="sr-only" htmlFor="date-to">
            To
          </label>
          <input
            id="date-to"
            type="date"
            className="w-full bg-transparent text-foreground focus:outline-none"
            value={toValue}
            onChange={(e) => {
              const nextTo = e.target.value;
              if (!nextTo) {
                if (!fromValue) {
                  setFromValue("");
                  setToValue("");
                  handleDateChange(undefined);
                  return;
                }
                setToValue(fromValue);
                pushDateRange(fromValue, fromValue);
                return;
              }

              const nextFrom = fromValue || nextTo;
              setFromValue(nextFrom);
              setToValue(nextTo);
              pushDateRange(nextFrom, nextTo);
            }}
          />
        </div>
      </div>
    </div>
  );
}
