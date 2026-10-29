import { describe, expect, it } from "vitest";

import { loginSchema, signupSchema, updatePasswordSchema } from "../schema";

describe("auth schemas", () => {
  it("normalises email to lowercase and trims", () => {
    const result = loginSchema.safeParse({
      email: "  USER@Farm.CO  ",
      password: "x",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("user@farm.co");
  });

  it("rejects short signup passwords", () => {
    const result = signupSchema.safeParse({
      fullName: "Jane",
      email: "jane@farm.co",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("turns an empty optional phone into undefined", () => {
    const result = signupSchema.safeParse({
      fullName: "Jane",
      email: "jane@farm.co",
      phone: "",
      password: "longenough",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBeUndefined();
  });

  it("requires matching passwords on update", () => {
    expect(
      updatePasswordSchema.safeParse({
        password: "longenough",
        confirm: "different",
      }).success,
    ).toBe(false);
    expect(
      updatePasswordSchema.safeParse({
        password: "longenough",
        confirm: "longenough",
      }).success,
    ).toBe(true);
  });
});
