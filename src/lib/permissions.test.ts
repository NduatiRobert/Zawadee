import { describe, expect, it } from "vitest";
import {
  can,
  FARM_ROLES,
  hasAnyRole,
  isFarmRole,
  type FarmRole,
} from "./permissions";

describe("permissions matrix", () => {
  it("lists the five roles", () => {
    expect(FARM_ROLES).toEqual([
      "owner",
      "manager",
      "vet",
      "worker",
      "accountant",
    ]);
  });

  it("only the owner manages members and billing", () => {
    const others: FarmRole[] = ["manager", "vet", "worker", "accountant"];
    expect(can("owner", "members:manage")).toBe(true);
    expect(can("owner", "billing:manage")).toBe(true);
    for (const role of others) {
      expect(can(role, "members:manage")).toBe(false);
      expect(can(role, "billing:manage")).toBe(false);
    }
  });

  it("owner and manager manage settings and view audit; others cannot", () => {
    expect(can("owner", "settings:manage")).toBe(true);
    expect(can("manager", "settings:manage")).toBe(true);
    expect(can("vet", "settings:manage")).toBe(false);
    expect(can("worker", "settings:manage")).toBe(false);
    expect(can("accountant", "audit:view")).toBe(false);
    expect(can("manager", "audit:view")).toBe(true);
  });

  it("hasAnyRole matches membership", () => {
    expect(hasAnyRole("vet", ["owner", "vet"])).toBe(true);
    expect(hasAnyRole("worker", ["owner", "manager"])).toBe(false);
  });

  it("isFarmRole guards unknown strings", () => {
    expect(isFarmRole("owner")).toBe(true);
    expect(isFarmRole("superadmin")).toBe(false);
  });
});
