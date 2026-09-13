import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "@/app/page";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createMockSupabaseClient } from "@/tests/utils/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/components/realtime-wrapper", () => ({
  RealtimeWrapper: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("dashboard calendar and app filters", () => {
  it("passes UTC day boundaries to inclusive-day RPCs", async () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    const client = createMockSupabaseClient();
    vi.mocked(createSupabaseServerClient).mockReturnValue(client);
    await Page({ searchParams: Promise.resolve({ from: "2026-09-01", to: "2026-09-01" }) });
    expect(client.rpc).toHaveBeenCalledWith(
      "get_daily_report_counts",
      {
        app_id_filter: null,
        start_date_filter: "2026-09-01T00:00:00.000Z",
        end_date_filter: "2026-09-01T00:00:00.000Z",
      },
      { count: "exact" },
    );
  });

  it("keeps the selected dates when server and browser time zones differ", async () => {
    vi.stubEnv("TZ", "UTC");
    vi.mocked(createSupabaseServerClient).mockReturnValue(createMockSupabaseClient());
    const page = await Page({
      searchParams: Promise.resolve({ from: "2026-09-01", to: "2026-09-01" }),
    });
    vi.stubEnv("TZ", "America/Los_Angeles");
    render(page);
    expect(screen.getByLabelText("From")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("To")).toHaveValue("2026-09-01");
  });

  it("accepts UUID versions beyond v5 and normalizes their case", async () => {
    const appId = "0194b560-0000-7000-8000-123456789ABC";
    const client = createMockSupabaseClient();
    vi.mocked(createSupabaseServerClient).mockReturnValue(client);
    await Page({ searchParams: Promise.resolve({ app: appId }) });
    expect(client.rpc).toHaveBeenCalledWith(
      "get_daily_report_counts",
      expect.objectContaining({ app_id_filter: appId.toLowerCase() }),
      { count: "exact" },
    );
  });
});
