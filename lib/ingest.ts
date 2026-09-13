import { mapCpuTypeToArch, parseTelemetryInteger } from "@/lib/telemetry";

const stringFields = ["ip", "appVersion", "osVersion", "cputype", "lang", "model"] as const;

function invalidPayload(error: string) {
  return { data: null, error };
}

export function parseIngestPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalidPayload("Invalid JSON payload");
  }

  const payload = value as Record<string, unknown>;
  if (!payload.bundleIdentifier) return invalidPayload("Missing bundleIdentifier");
  if (typeof payload.bundleIdentifier !== "string")
    return invalidPayload("Invalid bundleIdentifier");

  for (const field of stringFields) {
    if (payload[field] != null && typeof payload[field] !== "string") {
      return invalidPayload(`Invalid ${field}`);
    }
  }
  for (const field of ["ncpu", "ramMB"] as const) {
    if (
      payload[field] != null &&
      payload[field] !== "" &&
      parseTelemetryInteger(payload[field]) === null
    ) {
      return invalidPayload(`Invalid ${field}: expected a non-negative 32-bit integer`);
    }
  }

  const optionalString = (field: (typeof stringFields)[number]) =>
    typeof payload[field] === "string" ? payload[field] || null : null;

  return {
    data: {
      bundleIdentifier: payload.bundleIdentifier,
      ip: optionalString("ip"),
      report: {
        app_version: optionalString("appVersion"),
        core_count: parseTelemetryInteger(payload.ncpu),
        cpu_arch: mapCpuTypeToArch(optionalString("cputype") ?? undefined),
        language: optionalString("lang"),
        model_identifier: optionalString("model"),
        os_version: optionalString("osVersion"),
        ram_mb: parseTelemetryInteger(payload.ramMB),
      },
    },
    error: null,
  };
}
