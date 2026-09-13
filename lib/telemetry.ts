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
