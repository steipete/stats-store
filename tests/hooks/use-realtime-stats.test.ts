import { createBrowserClient } from "@supabase/ssr";
import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type RealtimeEvent, useRealtimeStats } from "@/hooks/use-realtime-stats";

vi.mock("@supabase/ssr", () => ({ createBrowserClient: vi.fn() }));
type Handler = (payload: { new: unknown }) => void;
type Config = { table: string; event: string; schema: string; filter?: string };
type Channel = {
  name: string;
  handlers: Map<string, Handler>;
  status?: (status: string) => void;
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};
const event = (id = 1, appId = "app"): RealtimeEvent => ({
  id,
  app_id: appId,
  created_at: "2026-09-13T12:00:00Z",
  event_type: "new_user",
  event_data: {
    app_version: "1.0",
    model: null,
    unique_users_today: 999,
    total_reports_today: 9999,
  },
});
let created: Channel[];
let live: Map<string, Channel>;
let client: {
  channel: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  created = [];
  live = new Map();
  client = {
    from: vi.fn(),
    channel: vi.fn((name: string) => {
      const existing = live.get(name);
      if (existing) return existing;
      const channel: Channel = {
        name,
        handlers: new Map(),
        on: vi.fn((_kind: string, config: Config, handler: Handler) => {
          channel.handlers.set(config.table, handler);
          return channel;
        }),
        subscribe: vi.fn((callback: (status: string) => void) => {
          channel.status = callback;
          return channel;
        }),
      };
      created.push(channel);
      live.set(name, channel);
      return channel;
    }),
    removeChannel: vi.fn(async (channel: Channel) => {
      live.delete(channel.name);
      return "ok";
    }),
  };
  vi.mocked(createBrowserClient).mockReturnValue(
    client as unknown as ReturnType<typeof createBrowserClient>,
  );
});
const connect = (channel: Channel) => act(() => channel.status?.("SUBSCRIBED"));
const emit = (channel: Channel, value: unknown, table = "realtime_events") =>
  act(() => channel.handlers.get(table)?.({ new: value }));

describe("realtime subscription ownership", () => {
  it("subscribes synchronously without fetching a cached day's totals", () => {
    const { result } = renderHook(() => useRealtimeStats());
    expect(created).toHaveLength(1);
    expect(client.from).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      isConnected: false,
      lastUpdate: undefined,
      realtimeEvents: [],
    });
    connect(created[0]);
    expect(result.current.isConnected).toBe(true);
  });
  it("filters both event streams for a selected app", () => {
    renderHook(() => useRealtimeStats({ appId: "app" }));
    expect(created[0].name).toContain("app-stats-app");
    const configs = created[0].on.mock.calls.map((call) => call[1]);
    expect(configs).toEqual([
      { event: "INSERT", schema: "public", table: "realtime_events", filter: "app_id=eq.app" },
      { event: "*", schema: "public", table: "stats_cache", filter: "app_id=eq.app" },
    ]);
  });
  it("refreshes after initial subscription and reconnection to catch missed reports", () => {
    const onInvalidate = vi.fn();
    renderHook(() => useRealtimeStats({ onInvalidate }));
    connect(created[0]);
    expect(onInvalidate).toHaveBeenCalledOnce();
    act(() => created[0].status?.("CHANNEL_ERROR"));
    connect(created[0]);
    expect(onInvalidate).toHaveBeenCalledTimes(2);
  });
  it('does not apply an app filter for "all"', () => {
    renderHook(() => useRealtimeStats({ appId: "all" }));
    expect(created[0].name).toContain("all-app-stats");
    expect(created[0].on.mock.calls.map((call) => call[1].filter)).toEqual([undefined, undefined]);
  });
  it("delivers new-client events and invalidates server data without adopting event totals", () => {
    const onNewUser = vi.fn();
    const onInvalidate = vi.fn();
    const { result } = renderHook(() => useRealtimeStats({ onNewUser, onInvalidate }));
    emit(created[0], event());
    expect(onNewUser).toHaveBeenCalledWith(event());
    expect(onInvalidate).toHaveBeenCalledOnce();
    expect(result.current.realtimeEvents).toEqual([event()]);
    expect(result.current.lastUpdate).toBeInstanceOf(Date);
    expect(result.current).not.toHaveProperty("statsCache");
  });
  it("delivers milestones", () => {
    const callback = vi.fn();
    renderHook(() => useRealtimeStats({ onMilestone: callback }));
    const milestone = {
      ...event(),
      event_type: "milestone",
      event_data: { message: "10 users today!" },
    };
    emit(created[0], milestone);
    expect(callback).toHaveBeenCalledWith(milestone);
  });
  it("delivers version changes and invalidates", () => {
    const onVersionUpdate = vi.fn();
    const onInvalidate = vi.fn();
    renderHook(() => useRealtimeStats({ onVersionUpdate, onInvalidate }));
    const version = {
      ...event(),
      event_type: "version_update",
      event_data: { new_version: "2.0" },
    };
    emit(created[0], version);
    expect(onVersionUpdate).toHaveBeenCalledWith(version);
    expect(onInvalidate).toHaveBeenCalledOnce();
  });
  it("invalidates on report batches", () => {
    const onInvalidate = vi.fn();
    renderHook(() => useRealtimeStats({ onInvalidate }));
    emit(created[0], { ...event(), event_type: "report_batch", event_data: {} });
    expect(onInvalidate).toHaveBeenCalledOnce();
  });
  it("invalidates on cache changes without adding an activity item", () => {
    const onInvalidate = vi.fn();
    const { result } = renderHook(() => useRealtimeStats({ onInvalidate }));
    emit(created[0], { stat_type: "kpis", stat_data: { unique_users_today: 999 } }, "stats_cache");
    expect(onInvalidate).toHaveBeenCalledOnce();
    expect(result.current.realtimeEvents).toEqual([]);
    expect(result.current.lastUpdate).toBeInstanceOf(Date);
  });
  it("keeps only the latest fifty activity events", () => {
    const { result } = renderHook(() => useRealtimeStats());
    act(() => {
      for (let id = 0; id < 60; id++)
        created[0].handlers.get("realtime_events")?.({ new: event(id) });
    });
    expect(result.current.realtimeEvents).toHaveLength(50);
    expect(result.current.realtimeEvents[0].id).toBe(59);
  });
  it.each(["CLOSED", "CHANNEL_ERROR", "TIMED_OUT"])("marks %s disconnected", (status) => {
    const { result } = renderHook(() => useRealtimeStats());
    connect(created[0]);
    act(() => created[0].status?.(status));
    expect(result.current.isConnected).toBe(false);
  });
  it("removes its channel on immediate unmount and ignores late callbacks", () => {
    const onNewUser = vi.fn();
    const onInvalidate = vi.fn();
    const { unmount } = renderHook(() => useRealtimeStats({ onNewUser, onInvalidate }));
    const channel = created[0];
    unmount();
    connect(channel);
    emit(channel, event());
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
    expect(live.size).toBe(0);
    expect(onNewUser).not.toHaveBeenCalled();
    expect(onInvalidate).not.toHaveBeenCalled();
  });
  it("clears history and status immediately when the app changes", () => {
    const { result, rerender } = renderHook(({ appId }) => useRealtimeStats({ appId }), {
      initialProps: { appId: "first" },
    });
    const old = created[0];
    connect(old);
    emit(old, event(1, "first"));
    rerender({ appId: "second" });
    expect(result.current).toEqual({
      isConnected: false,
      lastUpdate: undefined,
      realtimeEvents: [],
    });
    connect(old);
    emit(old, event(2, "first"));
    expect(result.current.isConnected).toBe(false);
    connect(created[1]);
    emit(created[1], event(3, "second"));
    expect(result.current.realtimeEvents.map((item) => item.id)).toEqual([3]);
  });
  it("uses current callbacks without resubscribing on rerender", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ callback }) => useRealtimeStats({ onNewUser: callback }), {
      initialProps: { callback: first },
    });
    rerender({ callback: second });
    emit(created[0], event());
    expect(created).toHaveLength(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
  it("owns distinct channels through Strict Mode effect replay", () => {
    const { unmount } = renderHook(() => useRealtimeStats(), { wrapper: StrictMode });
    expect(created).toHaveLength(2);
    expect(created[0].name).not.toBe(created[1].name);
    expect(live.size).toBe(1);
    unmount();
    expect(live.size).toBe(0);
    expect(client.removeChannel).toHaveBeenCalledTimes(2);
  });
  it("does not unsubscribe another consumer of the same app", () => {
    const first = renderHook(() => useRealtimeStats({ appId: "app" }));
    const second = renderHook(() => useRealtimeStats({ appId: "app" }));
    expect(created).toHaveLength(2);
    connect(created[1]);
    first.unmount();
    expect(live.size).toBe(1);
    expect(second.result.current.isConnected).toBe(true);
    emit(created[1], event());
    expect(second.result.current.realtimeEvents).toHaveLength(1);
  });
  it("ignores event types this client does not render", () => {
    const onInvalidate = vi.fn();
    const { result } = renderHook(() => useRealtimeStats({ onInvalidate }));
    emit(created[0], { ...event(), event_type: "future-type" });
    expect(result.current.realtimeEvents).toEqual([]);
    expect(onInvalidate).not.toHaveBeenCalled();
  });
});
