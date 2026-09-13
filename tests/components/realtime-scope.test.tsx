import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RealtimeWrapper } from "@/components/realtime-wrapper";
import { KpiCard } from "@/components/kpi-card";
import { RealtimeKpiCard } from "@/components/realtime-kpi-card";
import { useRealtimeStats } from "@/hooks/use-realtime-stats";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/hooks/use-realtime-stats");
vi.mock("sonner", () => ({ Toaster: () => null, toast: { success: vi.fn() } }));

vi.mock("framer-motion", async () => import("@/tests/utils/motion"));

const event = {
  id: 1,
  app_id: "app",
  created_at: "2026-09-13T12:00:00Z",
  event_type: "new_user" as const,
  event_data: { app_version: "2.2", model: "Fixture Mac" },
};
const filtered = {
  kpis: { unique_installs: 100, reports_this_period: 500, latest_version: "1.0" },
};
const cachedDay = {
  isConnected: true,
  lastUpdate: undefined,
  realtimeEvents: [event],
  refreshCache: vi.fn(),
  statsCache: {
    kpis: {
      unique_users_today: 999,
      total_reports_today: 9999,
      last_update: "2026-09-13T12:00:00Z",
    },
    latest_version: { version: "9.0" },
  },
};
let invalidate: (() => void) | undefined;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRealtimeStats).mockImplementation((options) => {
    invalidate = options?.onInvalidate;
    return cachedDay;
  });
});
afterEach(() => vi.useRealTimers());

it("keeps filtered server KPIs when a different day is cached", () => {
  render(
    <RealtimeWrapper selectedAppId="app" initialData={filtered}>
      <div>Charts</div>
    </RealtimeWrapper>,
  );
  expect(screen.getByText("100")).toBeInTheDocument();
  expect(screen.getByText("500")).toBeInTheDocument();
  expect(screen.getByText("1.0")).toBeInTheDocument();
  expect(screen.queryByText("9,999")).not.toBeInTheDocument();
});

it("connects the footer button to the actual activity panel", () => {
  render(
    <RealtimeWrapper selectedAppId="app" initialData={filtered}>
      <div>Charts</div>
    </RealtimeWrapper>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Activity Feed/ }));
  expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  expect(screen.getByText(/2.2.*Fixture Mac/)).toBeInTheDocument();
});

it("coalesces invalidations into one server refresh and cancels pending work on unmount", () => {
  vi.useFakeTimers();
  const { unmount } = render(
    <RealtimeWrapper selectedAppId="app" initialData={filtered}>
      <div>Charts</div>
    </RealtimeWrapper>,
  );
  expect(invalidate).toBeTypeOf("function");
  act(() => {
    invalidate?.();
    invalidate?.();
    vi.advanceTimersByTime(500);
  });
  expect(refresh).toHaveBeenCalledOnce();
  act(() => invalidate?.());
  unmount();
  act(() => vi.advanceTimersByTime(500));
  expect(refresh).toHaveBeenCalledOnce();
});

it("renders a numeric zero", () => {
  render(<KpiCard title="Reports" value={0} />);
  expect(screen.getByText("0")).toBeInTheDocument();
});

it("always renders the current value instead of retaining state from a previous-value hint", () => {
  const props = {
    title: "Reports",
    iconName: "cube" as const,
    iconColor: "blue",
    value: 1,
    previousValue: 1,
  };
  const { rerender } = render(<RealtimeKpiCard {...props} />);
  const next = { ...props, value: 2, previousValue: 2 };
  rerender(<RealtimeKpiCard {...next} />);
  expect(screen.getByText("2")).toBeInTheDocument();
});
