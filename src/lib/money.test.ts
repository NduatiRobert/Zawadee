import { describe, expect, it } from "vitest";
import {
  formatMoney,
  fromMinorUnits,
  toMinorUnits,
  DEFAULT_CURRENCY,
} from "./money";

describe("money", () => {
  it("formats KES by default", () => {
    // Intl may use a non-breaking space; assert on the parts that are stable.
    const formatted = formatMoney(1234.5);
    expect(formatted).toContain("1,234.50");
    expect(DEFAULT_CURRENCY).toBe("KES");
  });

  it("formats an explicit currency", () => {
    expect(formatMoney(10, "USD", "en-US")).toBe("$10.00");
  });

  it("round-trips through minor units without float drift", () => {
    expect(toMinorUnits(12.34)).toBe(1234);
    expect(fromMinorUnits(1234)).toBe(12.34);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
  });
});
