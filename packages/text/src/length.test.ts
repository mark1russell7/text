import { describe, expect, it } from "vitest";
import { graphemeEnds, textsNear } from "../test/strings.ts";
import { pad, type TextBoundary, type TextUnit, textLength, truncate } from "./length.ts";

// Made-up texts. The comment of each one gives its length in code units, code points and graphemes.
const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}"; // 11, 7, 1
const FLAG = "\u{1F1EF}\u{1F1F5}"; // 4, 2, 1
const FLAG_2 = "\u{1F1EB}\u{1F1F7}"; // 4, 2, 1
const SMILE = "\u{1F600}"; // 2, 1, 1
const ACCENT = "é"; // 2, 2, 1
const JAMO = "각"; // 3, 3, 1
const UNITS: readonly TextUnit[] = ["code-unit", "code-point", "grapheme"];
const BOUNDARIES: readonly TextBoundary[] = ["code-point", "grapheme"];
const BAD_COUNTS: readonly number[] = [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, -0.5, Number.MAX_VALUE * -1];

const lengths = (text: string): number[] => UNITS.map((unit) => textLength(text, unit));
const isHigh = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLow = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;
/** A cut at `index` splits a surrogate pair. */
const splitsPair = (text: string, index: number): boolean => isHigh(text.charCodeAt(index - 1)) && isLow(text.charCodeAt(index));

describe("textLength", () => {
  it.each([
    ["", [0, 0, 0]],
    ["abc", [3, 3, 3]],
    [SMILE, [2, 1, 1]],
    [FAMILY, [11, 7, 1]],
    [FLAG, [4, 2, 1]],
    [FLAG + FLAG_2, [8, 4, 2]],
    ["\u{1F1E6}".repeat(3), [6, 3, 2]],
    [ACCENT, [2, 2, 1]],
    ["한국", [2, 2, 2]],
    [JAMO + JAMO, [6, 6, 2]],
    ["\r\n", [2, 2, 1]],
    ["क्ष", [3, 3, 1]],
    ["\uD800", [1, 1, 1]],
    ["\uDE00\uD83D", [2, 2, 2]],
  ] as const)("gives the length of %j in code units, code points and graphemes", (text, expected) => {
    expect(lengths(text)).toEqual(expected);
  });

  it("counts code units when no unit is given", () => {
    expect(textLength(FAMILY)).toBe(FAMILY.length);
  });

  it("stops a unit that is not in the type with a RangeError", () => {
    expect(() => textLength("a", "byte" as TextUnit)).toThrow(RangeError);
    expect(() => textLength("a", "byte" as TextUnit)).toThrow("unit is byte, not code-unit, code-point or grapheme");
  });
});

describe("truncate", () => {
  it("gives back a text that fits as it is, with no mark", () => {
    expect(truncate("abc", 3)).toBe("abc");
    expect(truncate("", 0)).toBe("");
    expect(truncate(FAMILY, 7, { unit: "code-point" })).toBe(FAMILY);
    expect(truncate(FAMILY + FLAG, 2, { unit: "grapheme" })).toBe(FAMILY + FLAG);
  });

  it("cuts at a code unit length, and keeps each grapheme whole by default", () => {
    expect(truncate("abc def ghi", 8)).toBe("abc def…");
    expect(truncate(`abc${SMILE}def`, 5)).toBe("abc…");
    expect(truncate(`ab${FLAG}cd`, 5)).toBe("ab…");
    expect(truncate(`caf${ACCENT}s`, 5)).toBe("caf…");
    expect(truncate("a\r\nb", 3)).toBe("a…");
    expect(truncate(`ab${FAMILY}cd`, 14)).toBe(`ab${FAMILY}…`);
  });

  it("with the boundary code-point, can cut a grapheme, but not a surrogate pair", () => {
    expect(truncate(`abc${SMILE}def`, 5, { boundary: "code-point" })).toBe("abc…");
    expect(truncate(`abc${SMILE}def`, 6, { boundary: "code-point" })).toBe(`abc${SMILE}…`);
    expect(truncate(`ab${FLAG}cd`, 5, { boundary: "code-point" })).toBe("ab\u{1F1EF}…");
    expect(truncate(`caf${ACCENT}s`, 5, { boundary: "code-point" })).toBe("cafe…");
  });

  it("cuts at a code point length", () => {
    expect(truncate(`abc${SMILE}def`, 5, { unit: "code-point" })).toBe(`abc${SMILE}…`);
    expect(truncate(`ab${FAMILY}cd`, 6, { unit: "code-point" })).toBe("ab…");
    expect(truncate(`ab${FAMILY}cd`, 6, { unit: "code-point", boundary: "code-point" })).toBe("ab\u{1F468}‍\u{1F469}…");
    expect(truncate(JAMO + JAMO, 4, { unit: "code-point" })).toBe(`${JAMO}…`);
    expect(truncate(JAMO + JAMO, 3, { unit: "code-point", boundary: "code-point" })).toBe("가…");
  });

  it("cuts at a grapheme length, and the boundary code-point has no effect", () => {
    expect(truncate(`ab${FLAG}${FLAG_2}cd`, 4, { unit: "grapheme" })).toBe(`ab${FLAG}…`);
    expect(truncate(`ab${FLAG}${FLAG_2}cd`, 4, { unit: "grapheme", boundary: "code-point" })).toBe(`ab${FLAG}…`);
    expect(truncate(`${FAMILY}${FAMILY}${FAMILY}`, 2, { unit: "grapheme" })).toBe(`${FAMILY}…`);
    expect(truncate("한국어", 2, { unit: "grapheme" })).toBe("한…");
  });

  it("gives no mark when the mark is longer than max, and only the mark when it has max units", () => {
    expect(truncate("hello", 0)).toBe("");
    expect(truncate(`${SMILE}${SMILE}`, 1)).toBe("…");
    expect(truncate("hello", 2, { mark: "..." })).toBe("he");
    expect(truncate("hello", 3, { mark: "..." })).toBe("...");
    expect(truncate("hello", 4, { mark: "..." })).toBe("h...");
    expect(truncate("hello world", 5, { mark: FAMILY })).toBe("hello");
    expect(truncate("hello world", 5, { mark: FAMILY, unit: "grapheme" })).toBe(`hell${FAMILY}`);
  });

  it("cuts with no mark when the mark is empty", () => {
    expect(truncate("hello", 3, { mark: "" })).toBe("hel");
    expect(truncate("hello", 0, { mark: "" })).toBe("");
  });

  it("cuts a title to 250 code points and a body to 1024 code points, with the mark", () => {
    const title = `Water main break on Elm Road ${SMILE}${FLAG} `.repeat(10);
    const body = `Avoid the area until 6 PM ${FAMILY} `.repeat(60);
    const cutTitle = truncate(title, 250, { unit: "code-point" });
    const cutBody = truncate(body, 1024, { unit: "code-point" });
    expect(textLength(title, "code-point")).toBeGreaterThan(250);
    expect(textLength(cutTitle, "code-point")).toBeLessThanOrEqual(250);
    expect(textLength(cutBody, "code-point")).toBeLessThanOrEqual(1024);
    expect(textLength(body, "code-point")).toBeGreaterThan(1024);
    expect(textLength(cutBody, "code-point")).toBeGreaterThan(1024 - 7);
    for (const [text, cut] of [[title, cutTitle], [body, cutBody]] as const) {
      expect(cut.endsWith("…")).toBe(true);
      expect(text.startsWith(cut.slice(0, -1))).toBe(true);
    }
  });

  it("stops a max that is not an integer of 0 or more with a RangeError", () => {
    for (const max of BAD_COUNTS) expect(() => truncate("abc", max), String(max)).toThrow(RangeError);
    expect(() => truncate("abc", "3" as unknown as number)).toThrow(RangeError);
    expect(() => truncate("abc", -1)).toThrow("max is -1, not an integer of 0 or more");
  });

  it("stops a unit or a boundary that is not in the type with a RangeError", () => {
    expect(() => truncate("abc", 1, { unit: "word" as TextUnit })).toThrow("unit is word, not code-unit, code-point or grapheme");
    expect(() => truncate("abc", 1, { boundary: "code-unit" as TextBoundary })).toThrow("boundary is code-unit, not code-point or grapheme");
  });

  describe("on seeded texts, in each unit and with each boundary", () => {
    const texts = textsNear("text/truncate", 300, 24);
    const marks = ["…", "...", "", SMILE, "́…", "\u{1F1E6}", "‍\u{1F600}"];

    for (const unit of UNITS) {
      for (const boundary of BOUNDARIES) {
        it(`unit ${unit}, boundary ${boundary}: the result fits, is the start of the text and the mark, and cuts at a boundary`, () => {
          for (const [index, text] of texts.entries()) {
            const mark = marks[index % marks.length]!;
            const markLength = textLength(mark, unit);
            const size = textLength(text, unit);
            for (const max of [0, 1, 2, 3, 5, 8, 13, 21, 34]) {
              const result = truncate(text, max, { unit, boundary, mark });
              const at = `${JSON.stringify(text)} max ${max} mark ${JSON.stringify(mark)}`;
              expect(textLength(result, unit), at).toBeLessThanOrEqual(max);
              if (size <= max) {
                expect(result, at).toBe(text);
                continue;
              }
              const end = markLength <= max ? mark : "";
              expect(result.endsWith(end), at).toBe(true);
              const start = result.slice(0, result.length - end.length);
              expect(text.startsWith(start), at).toBe(true);
              expect(splitsPair(text, start.length), at).toBe(false);
              if (boundary === "grapheme" || unit === "grapheme") expect(graphemeEnds(text).has(start.length), at).toBe(true);
              // The start is the longest one: the next part at the boundary does not fit.
              const ends = [...(boundary === "grapheme" || unit === "grapheme" ? graphemeEnds(text) : codePointEnds(text))].sort((a, b) => a - b);
              const next = ends.find((e) => e > start.length)!;
              expect(textLength(text.slice(0, next), unit) + textLength(end, unit), at).toBeGreaterThan(max);
            }
          }
        });
      }
    }
  });
});

/** The code point boundaries of a text, as indexes of code units. */
function codePointEnds(text: string): ReadonlySet<number> {
  const ends = new Set([0]);
  let index = 0;
  for (const point of text) ends.add((index += point.length));
  return ends;
}

describe("pad", () => {
  it("adds spaces at the end to a code unit width by default", () => {
    expect(pad("ab", 5)).toBe("ab   ");
    expect(pad("", 2)).toBe("  ");
  });

  it("gives back a text that has width units or more as it is, and does not cut it", () => {
    expect(pad("abc", 3)).toBe("abc");
    expect(pad("abcdef", 3)).toBe("abcdef");
    expect(pad("abc", 0, { side: "both" })).toBe("abc");
    expect(pad(FAMILY, 1, { unit: "grapheme" })).toBe(FAMILY);
  });

  it("adds the fill at the start, at the end or at the two sides", () => {
    expect(pad("ab", 6, { side: "start", fill: "." })).toBe("....ab");
    expect(pad("ab", 6, { side: "end", fill: "." })).toBe("ab....");
    expect(pad("ab", 6, { side: "both", fill: "." })).toBe("..ab..");
    expect(pad("ab", 7, { side: "both", fill: "." })).toBe("..ab...");
  });

  it("repeats a fill of more than one unit from its start, as padStart and padEnd do", () => {
    expect(pad("ab", 7, { fill: "-=" })).toBe("ab-=-=-");
    expect(pad("ab", 7, { fill: "-=", side: "start" })).toBe("ab".padStart(7, "-="));
    expect(pad("ab", 7, { fill: "-=", side: "both" })).toBe("-=ab-=-");
  });

  it("does not add a part of a grapheme of the fill by default, so the result can be shorter than width", () => {
    expect(pad("ab", 5, { fill: SMILE })).toBe(`ab${SMILE}`);
    expect(pad("ab", 5, { fill: SMILE, boundary: "code-point" })).toBe(`ab${SMILE}`);
    expect(pad("x", 10, { fill: FAMILY, unit: "code-point" })).toBe(`x${FAMILY}`);
    expect(pad("x", 10, { fill: FAMILY, unit: "code-point", boundary: "code-point" })).toBe(`x${FAMILY}\u{1F468}‍`);
    expect(pad("x", 6, { fill: `a${ACCENT}` })).toBe(`xa${ACCENT}a`);
    expect(pad("x", 6, { fill: `a${ACCENT}`, boundary: "code-point" })).toBe(`xa${ACCENT}ae`);
  });

  it("pads to a code point width and to a grapheme width", () => {
    expect(pad("ab", 5, { fill: SMILE, unit: "code-point", side: "start" })).toBe(`${SMILE}${SMILE}${SMILE}ab`);
    expect(pad(FLAG, 4, { fill: FLAG_2, unit: "grapheme" })).toBe(FLAG + FLAG_2 + FLAG_2 + FLAG_2);
    expect(pad(JAMO, 3, { fill: "한", unit: "grapheme", side: "both" })).toBe(`한${JAMO}한`);
  });

  it("stops a bad width, an empty fill, and a bad unit, boundary or side with a RangeError", () => {
    for (const width of BAD_COUNTS) expect(() => pad("abc", width), String(width)).toThrow(RangeError);
    expect(() => pad("abc", -2)).toThrow("width is -2, not an integer of 0 or more");
    expect(() => pad("abc", 5, { fill: "" })).toThrow("fill is an empty text");
    expect(() => pad("abc", 1, { fill: "" })).toThrow(RangeError);
    expect(() => pad("abc", 5, { side: "middle" as "start" })).toThrow("side is middle, not start, end or both");
    expect(() => pad("abc", 5, { unit: "word" as TextUnit })).toThrow(RangeError);
    expect(() => pad("abc", 5, { boundary: "word" as TextBoundary })).toThrow(RangeError);
  });

  describe("on seeded texts, in each unit and with each boundary", () => {
    const texts = textsNear("text/pad", 200, 12);
    const fills = [" ", "-=", SMILE, FAMILY, `a${ACCENT}`, FLAG, "\u{1F1E6}", "́"];

    for (const unit of UNITS) {
      for (const boundary of BOUNDARIES) {
        it(`unit ${unit}, boundary ${boundary}: the text is in the result, with whole parts of the fill, and the result fits in width`, () => {
          for (const [index, text] of texts.entries()) {
            const fill = fills[index % fills.length]!;
            const side = (["start", "end", "both"] as const)[index % 3]!;
            const size = textLength(text, unit);
            for (const width of [0, 1, 4, 9, 16, 25, 36]) {
              const result = pad(text, width, { unit, boundary, fill, side });
              const at = `${JSON.stringify(text)} width ${width} fill ${JSON.stringify(fill)} side ${side}`;
              if (size >= width) {
                expect(result, at).toBe(text);
                continue;
              }
              expect(textLength(result, unit), at).toBeLessThanOrEqual(width);
              // Each fill is whole copies of the fill and then a start of the fill, cut at a boundary.
              const isFill = (added: string): boolean => {
                const copies = Math.floor(added.length / fill.length);
                const rest = added.slice(copies * fill.length);
                const atBoundary = boundary === "grapheme" || unit === "grapheme" ? graphemeEnds(fill).has(rest.length) : !splitsPair(fill, rest.length);
                return added.slice(0, copies * fill.length) === fill.repeat(copies) && fill.startsWith(rest) && atBoundary;
              };
              const places =
                side === "start" ? [result.length - text.length] : side === "end" ? [0] : Array.from({ length: result.length + 1 }, (_, w) => w);
              const where = places.find(
                (w) => result.slice(w, w + text.length) === text && isFill(result.slice(0, w)) && isFill(result.slice(w + text.length)),
              );
              expect(where, at).toBeDefined();
              if (where === undefined) continue;
              if (side === "both") expect(textLength(result.slice(0, where), unit), at).toBeLessThanOrEqual(Math.floor((width - size) / 2));
              if (unit !== "grapheme") {
                // In code units and code points the fill adds exactly its units, so the result misses at most one part of the fill.
                const added = textLength(result.slice(0, where), unit) + textLength(result.slice(where + text.length), unit);
                expect(size + added, at).toBeGreaterThan(width - 2 * textLength(fill, unit));
              }
            }
          }
        });
      }
    }
  });
});
