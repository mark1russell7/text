import { random } from "@mark1russell7/rigor-generators";
import { describe, expect, it } from "vitest";
import { listOf } from "./english.ts";
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

/** The pieces of a seeded part: no comma and no space, so the test can split the list again. */
const PIECES: readonly string[] = ["a", "Z", "0", "9", "é", "日本", "😀", "&amp;", "x-y", "</p>", "'", '"'];

/** This function gives `count` lists of 0 to 8 parts of 1 to 3 pieces, from the seed `seed`. */
function lists(seed: string, count: number): string[][] {
  const r = random(seed);
  const part = (): string => Array.from({ length: r.int(1, 3) }, () => r.pick(PIECES)).join("");
  return Array.from({ length: count }, () => Array.from({ length: r.int(0, 8) }, part));
}

/** This function splits a list of parts with no comma and no space into its parts again. */
function split(text: string, conjunction: string, serialComma: boolean): string[] {
  if (text === "") return [];
  const at = text.lastIndexOf(` ${conjunction} `);
  if (at < 0) return [text];
  const head = text.slice(0, at);
  const parts = (serialComma && head.endsWith(",") ? head.slice(0, -1) : head).split(", ");
  return [...parts, text.slice(at + conjunction.length + 2)];
}

describe("listOf", () => {
  it("gives an empty text, one part, two parts with the conjunction, or the parts with commas", () => {
    expect(listOf([])).toBe("");
    expect(listOf(["a"])).toBe("a");
    expect(listOf(["a", "b"])).toBe("a and b");
    expect(listOf(["a", "b", "c"])).toBe("a, b and c");
    expect(listOf(["a", "b", "c", "d"])).toBe("a, b, c and d");
  });

  it("uses the conjunction that it gets", () => {
    expect(listOf(["a", "b"], { conjunction: "or" })).toBe("a or b");
    expect(listOf(["a", "b", "c"], { conjunction: "or" })).toBe("a, b or c");
  });

  it("puts the serial comma only in a list of three parts or more", () => {
    expect(listOf(["a"], { serialComma: true })).toBe("a");
    expect(listOf(["a", "b"], { serialComma: true })).toBe("a and b");
    expect(listOf(["a", "b", "c"], { serialComma: true })).toBe("a, b, and c");
    expect(listOf(["a", "b", "c"], { conjunction: "or", serialComma: true })).toBe("a, b, or c");
  });

  it("does not change the parts: an empty part and a part with a comma stay", () => {
    expect(listOf([""])).toBe("");
    expect(listOf(["", "b"])).toBe(" and b");
    expect(listOf(["a, b", "c"])).toBe("a, b and c");
  });

  for (const conjunction of ["and", "or"]) {
    for (const serialComma of [false, true]) {
      it(`${conjunction}, serial comma ${serialComma}: the count of commas and conjunctions, and a round trip, on 2000 seeded lists`, () => {
        for (const parts of lists(`text/list/${conjunction}/${serialComma}`, 2000)) {
          const text = listOf(parts, { conjunction, serialComma });
          const n = parts.length;
          const commas = Math.max(0, n - 2) + (serialComma && n > 2 ? 1 : 0);
          expect(text.split(",").length - 1, text).toBe(commas);
          expect(text.split(` ${conjunction} `).length - 1, text).toBe(n >= 2 ? 1 : 0);
          expect(split(text, conjunction, serialComma), text).toEqual(parts);
        }
      });
    }
  }
});
