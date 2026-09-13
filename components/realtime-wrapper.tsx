"use client";

import type { ReactNode } from "react";
import { RealtimeDashboard, type RealtimeDashboardProps } from "./realtime-dashboard";

type RealtimeWrapperProps = RealtimeDashboardProps & { children: ReactNode };

export function RealtimeWrapper(props: RealtimeWrapperProps) {
  return <RealtimeDashboard key={props.selectedAppId} {...props} />;
}
