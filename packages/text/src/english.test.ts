import { describe, expect, it } from "vitest";
import { countOf } from "./index.ts";

describe("countOf", () => {
  it("gives the singular noun only for the count 1", () => {
    expect(countOf(1, "site")).toBe("1 site");
    expect(countOf(0, "site")).toBe("0 sites");
    expect(countOf(2, "site")).toBe("2 sites");
    expect(countOf(-1, "site")).toBe("-1 sites");
    expect(countOf(1.5, "site")).toBe("1.5 sites");
  });

  it("uses the plural noun that it gets", () => {
    expect(countOf(3, "match", "matches")).toBe("3 matches");
    expect(countOf(1, "match", "matches")).toBe("1 match");
  });

  it("gives the digit groups of English and at most three decimal places", () => {
    expect(countOf(1024, "site")).toBe("1,024 sites");
    expect(countOf(1_234_567, "pick")).toBe("1,234,567 picks");
    expect(countOf(0.12345, "unit")).toBe("0.123 units");
  });
});
