import { describe, expect, it } from "vitest";
import { compareCodePoints, compareCodeUnits } from "./order.ts";

// The code units at the edges of the ranges: a letter, the last unit before the surrogates, the edges of the high and
// the low surrogates, the first unit after them and the last unit of the BMP.
const UNITS = ["a", "퟿", "\ud800", "\udbff", "\udc00", "\udfff", "", "￿"];

// Each text of 3 code units or fewer from `UNITS`. These texts hold each pair, each lone surrogate and each mix.
function texts(): string[] {
  const all = [""];
  let last = [""];
  for (let size = 1; size <= 3; size += 1) {
    last = last.flatMap((text) => UNITS.map((unit) => text + unit));
    all.push(...last);
  }
  return all;
}

// The code points of a text. `Array.from` gives a lone surrogate as its own code point.
const points = (text: string): number[] => Array.from(text, (part) => part.codePointAt(0)!);

// The rule of the docs: at the first code point that is different, one text has a code point above U+FFFF, and the other
// text has a lone surrogate or a code unit from U+E000 to U+FFFF. Each of these is a code point from U+D800 to U+FFFF.
function inRule(a: string, b: string): boolean {
  const x = points(a);
  const y = points(b);
  const end = Math.min(x.length, y.length);
  let index = 0;
  while (index < end && x[index] === y[index]) index += 1;
  if (index === end) return false;
  const above = (point: number): boolean => point > 0xffff;
  const unit = (point: number): boolean => point >= 0xd800 && point <= 0xffff;
  return (above(x[index]!) && unit(y[index]!)) || (above(y[index]!) && unit(x[index]!));
}

// The reference order: the code points of `Array.from`.
function byCodePoints(a: string, b: string): number {
  const x = points(a);
  const y = points(b);
  for (let index = 0; index < Math.min(x.length, y.length); index += 1) {
    if (x[index] !== y[index]) return x[index]! < y[index]! ? -1 : 1;
  }
  return Math.sign(x.length - y.length);
}

describe("compareCodeUnits", () => {
  it("gives the order of the operator <, as -1, 0 or 1", () => {
    expect(compareCodeUnits("a", "b")).toBe(-1);
    expect(compareCodeUnits("b", "a")).toBe(1);
    expect(compareCodeUnits("a", "a")).toBe(0);
    expect(compareCodeUnits("", "a")).toBe(-1);
    expect(compareCodeUnits("Z", "a")).toBe(-1);
  });

  it("sorts as the default sort", () => {
    const all = texts();
    expect([...all].sort(compareCodeUnits)).toEqual([...all].sort());
  });

  it("puts a code point above U+FFFF before U+FF5E, because its high surrogate is lower", () => {
    expect(compareCodeUnits("\u{1F600}", "～")).toBe(-1);
  });
});

describe("compareCodePoints", () => {
  it("puts a code point above U+FFFF after each code point of the BMP", () => {
    expect(compareCodePoints("\u{1F600}", "～")).toBe(1);
    expect(compareCodePoints("～", "\u{1F600}")).toBe(-1);
    expect(compareCodePoints("\u{1F600}", "￿")).toBe(1);
    expect(compareCodePoints("\u{10000}", "\u{1F600}")).toBe(-1);
    expect(compareCodePoints("x\u{1F600}", "x")).toBe(1);
  });

  it("compares the low surrogates of two pairs with one high surrogate", () => {
    expect(compareCodePoints("\u{1F600}", "\u{1F601}")).toBe(-1);
    expect(compareCodePoints("\u{1F601}", "\u{1F600}")).toBe(1);
  });

  it("puts a pair after a lone low surrogate, and after a lone high surrogate above its own high surrogate", () => {
    expect(compareCodeUnits("\u{1F600}", "\udc00")).toBe(-1);
    expect(compareCodePoints("\u{1F600}", "\udc00")).toBe(1);
    expect(compareCodeUnits("\u{1F600}", "\ud83e")).toBe(-1);
    expect(compareCodePoints("\u{1F600}", "\ud83e")).toBe(1);
  });

  it("gives a lone surrogate the value of its code unit", () => {
    // A lone high surrogate is U+D83D, below U+E000. A pair with that high surrogate is above U+FFFF.
    expect(compareCodePoints("\ud83d", "")).toBe(-1);
    expect(compareCodePoints("\ud83dx", "\u{1F600}")).toBe(-1);
    expect(compareCodePoints("\ud83d", "\u{1F600}")).toBe(-1);
  });

  it("gives the same order as the code units for texts with no code point above U+FFFF", () => {
    for (const [a, b] of [["a", "b"], ["ab", "a"], ["", ""], ["", "퟿"]] as const) {
      expect(compareCodePoints(a, b)).toBe(compareCodeUnits(a, b));
    }
  });

  it("gives the reference order for each two texts of 3 code units or fewer", () => {
    const all = texts();
    let differences = 0;
    let byUnits = 0;
    let outside = 0;
    for (const a of all) {
      for (const b of all) {
        const expected = byCodePoints(a, b);
        if (compareCodePoints(a, b) !== expected) differences += 1;
        // The two orders are different only in the case of the docs.
        if (compareCodeUnits(a, b) !== expected) {
          byUnits += 1;
          if (!inRule(a, b)) outside += 1;
        }
      }
    }
    expect(differences).toBe(0);
    expect(outside).toBe(0);
    // The texts have cases of the rule, thus the gate is not empty.
    expect(byUnits).toBeGreaterThan(0);
  });
});
