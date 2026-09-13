import { createHash } from "node:crypto";
import { after, NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/appcast/[...path]/route";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  or: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({ from: mocks.from }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  const result = {
    data: { id: "app-id", appcast_base_url: "https://example.com/feed.xml" },
    error: null,
  };
  mocks.single.mockResolvedValue(result);
  mocks.maybeSingle.mockResolvedValue(result);
  mocks.insert.mockResolvedValue({ error: null });
  const query = {
    select: vi.fn(() => query),
    eq: mocks.eq,
    or: mocks.or,
    single: mocks.single,
    maybeSingle: mocks.maybeSingle,
    insert: mocks.insert,
  };
  mocks.eq.mockReturnValue(query);
  mocks.or.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("<rss/>", { headers: { "Content-Type": "application/xml" } })),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function request(params: Record<string, string>) {
  return GET(
    new NextRequest(`http://localhost/api/v1/appcast/appcast.xml?${new URLSearchParams(params)}`),
    { params: Promise.resolve({ path: ["appcast.xml"] }) },
  );
}

async function flushTelemetry() {
  const callback = vi.mocked(after).mock.calls[0]?.[0];
  expect(callback).toBeTypeOf("function");
  if (typeof callback === "function") await callback();
}

describe("appcast lookup and request lifetime", () => {
  it("registers telemetry with Next's post-response lifecycle", async () => {
    const response = await request({ bundleIdentifier: "com.example.app" });
    expect(response.status).toBe(200);
    expect(mocks.insert).not.toHaveBeenCalled();
    await flushTelemetry();
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("quotes app names so PostgREST syntax is literal data", async () => {
    const appName = 'Example, App (Beta) "Test" \\ Kit';
    expect((await request({ appName })).status).toBe(200);
    expect(mocks.or).toHaveBeenCalledWith(
      `display_name.eq.${JSON.stringify(appName)},name.eq.${JSON.stringify(appName)}`,
    );
  });

  it("records the identifier that actually matched after fallback", async () => {
    mocks.single.mockResolvedValueOnce({ data: null, error: null });
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(
      (await request({ bundleIdentifier: "com.unknown.app", appName: "Example" })).status,
    ).toBe(200);
    await flushTelemetry();
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ app_id_source: "appName" }),
    );
  });

  it("returns 500 for a failed registry query", async () => {
    const error = { data: null, error: { code: "XX000", message: "Database unavailable" } };
    mocks.single.mockResolvedValue(error);
    mocks.maybeSingle.mockResolvedValue(error);
    expect((await request({ bundleIdentifier: "com.example.app" })).status).toBe(500);
    expect(after).not.toHaveBeenCalled();
  });

  it("ignores invalid profile integers while still serving updates", async () => {
    expect(
      (
        await request({
          bundleIdentifier: "com.example.app",
          ncpu: "8garbage",
          ramMB: "2147483648",
          cpuFreqMHz: "-1",
          cpu64bit: "invalid",
        })
      ).status,
    ).toBe(200);
    await flushTelemetry();
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ core_count: null, ram_mb: null, cpu_freq_mhz: null }),
    );
  });

  it("uses the real-IP fallback when the first forwarded address is empty", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-12T12:00:00Z"));
    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app",
        {
          headers: { "x-forwarded-for": " , 192.0.2.2", "x-real-ip": "198.51.100.9" },
        },
      ),
      { params: Promise.resolve({ path: ["appcast.xml"] }) },
    );
    expect(response.status).toBe(200);
    await flushTelemetry();
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_hash: createHash("sha256").update("198.51.100.92026-09-12").digest("hex"),
      }),
    );
  });

  it("contains telemetry transport rejections after returning the feed", async () => {
    mocks.insert.mockRejectedValue(new Error("Telemetry transport unavailable"));
    expect((await request({ bundleIdentifier: "com.example.app" })).status).toBe(200);
    await expect(flushTelemetry()).resolves.toBeUndefined();
  });
});
