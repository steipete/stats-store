import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { RealtimeDashboard } from "@/components/realtime-dashboard";
import { type RealtimeEvent, useRealtimeStats } from "@/hooks/use-realtime-stats";

vi.mock("@/hooks/use-realtime-stats");
vi.mock("sonner", () => ({ Toaster: () => null, toast: { success: vi.fn() } }));
vi.mock("framer-motion", async () => import("@/tests/utils/motion"));
const initialData = {
  kpis: { unique_installs: 100, reports_this_period: 500, latest_version: "1.0.0" },
  kpisError: {},
};
const base = { isConnected: false, lastUpdate: undefined, realtimeEvents: [] } satisfies ReturnType<
  typeof useRealtimeStats
>;
const event: RealtimeEvent = {
  id: 1,
  app_id: "app",
  created_at: "2024-01-15T10:30:00Z",
  event_type: "new_user",
  event_data: { app_version: "1.0.0", model: "MacBookPro" },
};
const show = () => render(<RealtimeDashboard selectedAppId="app" initialData={initialData} />);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRealtimeStats).mockReturnValue(base);
});

describe("RealtimeDashboard", () => {
  it("renders server KPI data", () => {
    show();
    for (const value of ["Unique Users", "100", "Total Reports", "500", "Latest Version", "1.0.0"])
      expect(screen.getByText(value)).toBeInTheDocument();
  });
  it("shows connection status and last activity time", () => {
    vi.mocked(useRealtimeStats).mockReturnValue({
      ...base,
      isConnected: true,
      lastUpdate: new Date("2024-01-15T10:30:00"),
    });
    show();
    expect(screen.getByText(/Real-time updates active/)).toBeInTheDocument();
    expect(screen.getByText(/Last update: 10:30:00/)).toBeInTheDocument();
  });
  it("shows activity count and toggles the real panel", () => {
    vi.mocked(useRealtimeStats).mockReturnValue({
      ...base,
      isConnected: true,
      realtimeEvents: [event],
    });
    show();
    const button = screen.getByRole("button", { name: /Activity Feed/ });
    expect(button).toHaveTextContent("1");
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Recent Activity" })).toHaveTextContent(
      "New daily client · 1.0.0 · MacBookPro",
    );
    fireEvent.click(button);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
  it("updates KPIs when refreshed server props arrive", () => {
    const { rerender } = show();
    rerender(
      <RealtimeDashboard
        selectedAppId="app"
        initialData={{
          kpis: { unique_installs: 150, reports_this_period: 600, latest_version: "1.1.0" },
        }}
      />,
    );
    for (const value of ["150", "600", "1.1.0"])
      expect(screen.getByText(value)).toBeInTheDocument();
  });
  it("preserves per-metric errors", () => {
    render(
      <RealtimeDashboard
        selectedAppId="app"
        initialData={{
          kpis: { unique_installs: "Error", reports_this_period: "Error", latest_version: "Error" },
          kpisError: {
            unique_installs: "Database error",
            reports_this_period: "Database error",
            latest_version: "Database error",
          },
        }}
      />,
    );
    expect(screen.getAllByText("Error")).toHaveLength(3);
  });
  it("renders all supported events and omits absent profile fields", () => {
    const events: RealtimeEvent[] = [
      { ...event, event_data: { app_version: null, model: null } },
      { ...event, id: 2, event_type: "milestone", event_data: { message: "10 users today!" } },
      { ...event, id: 3, event_type: "version_update", event_data: { new_version: "2.0" } },
      { ...event, id: 4, event_type: "report_batch", event_data: {} },
    ];
    vi.mocked(useRealtimeStats).mockReturnValue({
      ...base,
      isConnected: true,
      realtimeEvents: events,
    });
    show();
    fireEvent.click(screen.getByRole("button", { name: /Activity Feed/ }));
    for (const label of [
      "New daily client",
      "10 users today!",
      "Version update: 2.0",
      "Update checks received",
    ])
      expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText(/null|undefined/)).not.toBeInTheDocument();
  });
  it("exposes metric explanations on keyboard focus", async () => {
    show();
    fireEvent.focus(screen.getByRole("group", { name: "Total Reports" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("selected date range");
  });
  it("shows disconnected status and activity controls before any events arrive", () => {
    show();
    expect(screen.queryByText(/Real-time updates active/)).not.toBeInTheDocument();
    expect(screen.getByText(/Real-time updates disconnected/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Activity Feed/ })).toBeInTheDocument();
  });
  it("shows an empty-state panel when no events have arrived", () => {
    vi.mocked(useRealtimeStats).mockReturnValue({ ...base, isConnected: true });
    show();
    fireEvent.click(screen.getByRole("button", { name: /Activity Feed/ }));
    expect(screen.getByText("No recent activity yet.")).toBeInTheDocument();
  });
  it("keeps activity readable and closable after disconnection", () => {
    vi.mocked(useRealtimeStats).mockReturnValue({
      ...base,
      isConnected: true,
      realtimeEvents: [event],
    });
    const { rerender } = show();
    fireEvent.click(screen.getByRole("button", { name: /Activity Feed/ }));
    vi.mocked(useRealtimeStats).mockReturnValue({ ...base, realtimeEvents: [event] });
    rerender(<RealtimeDashboard selectedAppId="app" initialData={initialData} />);
    expect(screen.getByText(/Real-time updates disconnected/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Activity Feed/ }));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
  it("shows milestone notifications for the selected app", () => {
    show();
    const options = vi.mocked(useRealtimeStats).mock.calls.at(-1)?.[0];
    options?.onMilestone?.({
      ...event,
      event_type: "milestone",
      event_data: { message: "10 users today!" },
    });
    expect(toast.success).toHaveBeenCalledWith("10 users today!");
  });
});
