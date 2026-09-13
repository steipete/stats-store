import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addUtcDays,
  eachUtcDay,
  formatChartDate,
  formatDateInput,
  normalizeDateRange,
  parseDateParameter,
} from "@/lib/date-range";

afterEach(() => vi.unstubAllEnvs());
describe.each(["UTC", "America/Los_Angeles", "Pacific/Kiritimati"])(
  "UTC calendar in %s",
  (timezone) => {
    it("keeps calendar inputs and chart days stable across DST", () => {
      vi.stubEnv("TZ", timezone);
      const day = parseDateParameter("2024-03-10")!;
      expect(day.toISOString()).toBe("2024-03-10T00:00:00.000Z");
      expect(formatDateInput(day)).toBe("2024-03-10");
      expect(
        [...eachUtcDay(addUtcDays(day, -1), addUtcDays(day, 1))].map((day) => formatChartDate(day)),
      ).toEqual(["Mar 09", "Mar 10", "Mar 11"]);
    });
    it("defaults to thirty UTC days around midnight", () => {
      vi.stubEnv("TZ", timezone);
      const range = normalizeDateRange({}, new Date("2026-09-13T00:30:00Z"));
      expect(formatDateInput(range.from)).toBe("2026-08-15");
      expect(formatDateInput(range.to)).toBe("2026-09-13");
    });
  },
);
it("preserves explicit ISO offsets and handles reversed and invalid dates", () => {
  expect(formatDateInput(parseDateParameter("2026-09-12T23:00:00-07:00")!)).toBe("2026-09-13");
  expect(parseDateParameter("2026-02-30")).toBeUndefined();
  expect(parseDateParameter(["2026-09-01"])).toBeUndefined();
  const range = normalizeDateRange({
    from: new Date("2026-09-12T00:00:00Z"),
    to: new Date("2026-09-01T00:00:00Z"),
  });
  expect(formatDateInput(range.from)).toBe("2026-09-01");
  expect(formatDateInput(range.to)).toBe("2026-09-12");
});
