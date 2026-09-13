import { createHash } from "node:crypto";

export function mapCpuTypeToArch(cputype?: string): string | undefined {
  if (!cputype) {
    return undefined;
  }
  if (cputype === "16777228") {
    return "arm64";
  }
  if (cputype === "16777223") {
    return "x86_64";
  }
  return "unknown";
}

export function dailyIpHash(ip: string, date = new Date()): string {
  return createHash("sha256")
    .update(ip + date.toISOString().slice(0, 10))
    .digest("hex");
}

export function parseTelemetryInteger(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !/^[+-]?\d+$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 2147483647 ? number : null;
}
