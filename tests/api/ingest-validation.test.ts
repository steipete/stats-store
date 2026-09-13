import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/ingest/route";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({ from: mocks.from }),
}));

async function submit(payload: unknown) {
  return POST(
    new NextRequest("http://localhost/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockResolvedValue({ error: null });
  mocks.single.mockResolvedValue({ data: { id: "app-id" }, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: { id: "app-id" }, error: null });
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: mocks.single,
    maybeSingle: mocks.maybeSingle,
    insert: mocks.insert,
  };
  mocks.from.mockReturnValue(query);
});

describe("ingest payload validation", () => {
  it.each([null, [], true, 42, "text"])(
    "rejects non-object JSON %j before database access",
    async (payload) => {
      expect((await submit(payload)).status).toBe(400);
      expect(mocks.from).not.toHaveBeenCalled();
    },
  );

  it.each([
    { bundleIdentifier: 42 },
    { bundleIdentifier: "com.example.app", appVersion: { version: "1" } },
    { bundleIdentifier: "com.example.app", ip: ["127.0.0.1"] },
    { bundleIdentifier: "com.example.app", cputype: 16777228 },
    { bundleIdentifier: "com.example.app", ncpu: "8garbage" },
    { bundleIdentifier: "com.example.app", ramMB: "1e4" },
    { bundleIdentifier: "com.example.app", ncpu: -1 },
    { bundleIdentifier: "com.example.app", ramMB: 2147483648 },
    { bundleIdentifier: "com.example.app", ncpu: 1.5 },
  ])("rejects invalid field types and whole-integer values %j", async (payload) => {
    expect((await submit(payload)).status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("accepts numeric strings and JSON integers without truncation", async () => {
    expect(
      (await submit({ bundleIdentifier: "com.example.app", ncpu: " 8 ", ramMB: 16384 })).status,
    ).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ core_count: 8, ram_mb: 16384 }),
    );
  });

  it("keeps omitted, empty, and null optional fields absent", async () => {
    expect(
      (
        await submit({
          bundleIdentifier: "com.example.app",
          appVersion: null,
          ncpu: "",
          ramMB: null,
        })
      ).status,
    ).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ app_version: null, core_count: null, ram_mb: null }),
    );
  });

  it("treats an absent registry row as an unknown app, not a database outage", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "0 rows" } });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await submit({ bundleIdentifier: "com.unknown.app" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unknown bundle identifier" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
