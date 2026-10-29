import { describe, expect, it } from "vitest";

import { createFarmSchema } from "../schema";

describe("createFarmSchema", () => {
  it("applies KES/Nairobi defaults", () => {
    const result = createFarmSchema.safeParse({ name: "Green Valley" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("KES");
      expect(result.data.timezone).toBe("Africa/Nairobi");
    }
  });

  it("uppercases the currency and rejects non 3-letter codes", () => {
    const ok = createFarmSchema.safeParse({ name: "Farm", currency: "usd" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.currency).toBe("USD");

    expect(
      createFarmSchema.safeParse({ name: "Farm", currency: "US" }).success,
    ).toBe(false);
  });

  it("requires a name of at least 2 characters", () => {
    expect(createFarmSchema.safeParse({ name: "A" }).success).toBe(false);
  });
});
