import { describe, expect, it } from "vitest";

import { slugify } from "./utils";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Green Valley Farm")).toBe("green-valley-farm");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugify("  O'Brien & Sons!!  ")).toBe("o-brien-sons");
  });

  it("removes diacritics", () => {
    expect(slugify("Niño Ranch")).toBe("nino-ranch");
  });

  it("matches the DB slug constraint pattern", () => {
    const slug = slugify("Green Valley Farm");
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("returns empty string when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("");
  });
});
