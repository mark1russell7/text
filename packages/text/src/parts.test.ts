import { random } from "@mark1russell7/rigor-generators";
import { describe, expect, it } from "vitest";
import { strings } from "../test/strings.ts";
import { partsAt, partsOf, type TextPart } from "./parts.ts";

const hits = (parts: readonly TextPart[]): string => parts.map((part) => (part.hit ? `[${part.text}]` : part.text)).join("");

/** This function gives the mark of each code unit: true when a part with `hit` has it. */
const maskOf = (parts: readonly TextPart[]): boolean[] => parts.flatMap((part) => Array.from({ length: part.text.length }, () => part.hit));

describe("partsAt", () => {
  it("marks each range and keeps the text between them", () => {
    expect(partsAt("And 11=2 is false", [[4, 8]])).toEqual([
      { text: "And ", hit: false },
      { text: "11=2", hit: true },
      { text: " is false", hit: false },
    ]);
  });

  it("sorts the ranges, joins the ranges that overlap, and keeps two ranges that touch apart", () => {
    expect(hits(partsAt("abcdefgh", [[5, 7], [0, 2], [1, 3]]))).toBe("[abc]de[fg]h");
    expect(partsAt("aaaa", [[0, 2], [2, 4]])).toEqual([
      { text: "aa", hit: true },
      { text: "aa", hit: true },
    ]);
    expect(hits(partsAt("abcdef", [[0, 5], [1, 2]]))).toBe("[abcde]f");
  });

  it("clamps each range to the text and drops an empty range", () => {
    expect(hits(partsAt("abc", [[-4, 1], [2, 99], [1, 1], [3, 2]]))).toBe("[a]b[c]");
    expect(partsAt("", [[0, 3]])).toEqual([]);
    expect(partsAt("abc", [])).toEqual([{ text: "abc", hit: false }]);
  });

  it("makes the text again and marks each code unit of a range, on 2000 seeded strings", () => {
    const r = random("text/parts-at");
    for (const text of strings("text/parts-at", 2000)) {
      const ranges = Array.from({ length: r.int(0, 4) }, () => [r.int(-2, text.length + 2), r.int(-2, text.length + 2)] as const);
      const parts = partsAt(text, ranges);
      expect(parts.map((part) => part.text).join("")).toBe(text);
      expect(parts.every((part) => part.text !== "")).toBe(true);
      const mask = Array.from({ length: text.length }, (_, unit) => ranges.some(([start, end]) => unit >= start && unit < end));
      expect(maskOf(parts)).toEqual(mask);
      expect(parts.some((part, index) => !part.hit && parts[index + 1]?.hit === false)).toBe(false);
    }
  });
});

describe("partsOf", () => {
  it("marks each copy from the start, with no overlap", () => {
    expect(hits(partsOf("key=[secret] and [secret]", "[secret]"))).toBe("key=[[secret]] and [[secret]]");
    expect(hits(partsOf("aaa", "aa"))).toBe("[aa]a");
  });

  it("gives one plain part for an empty find or no copy", () => {
    expect(partsOf("abc", "")).toEqual([{ text: "abc", hit: false }]);
    expect(partsOf("abc", "x")).toEqual([{ text: "abc", hit: false }]);
    expect(partsOf("", "x")).toEqual([]);
  });

  it("marks the copies that split finds, on 2000 seeded strings", () => {
    const r = random("text/parts-of");
    for (const text of strings("text/parts-of", 2000)) {
      const start = r.int(0, text.length);
      const find = text.slice(start, r.int(start, Math.min(text.length, start + 3)));
      const parts = partsOf(text, find);
      expect(parts.map((part) => part.text).join("")).toBe(text);
      const found = parts.filter((part) => part.hit);
      expect(found.every((part) => part.text === find)).toBe(true);
      expect(found).toHaveLength(find === "" ? 0 : text.split(find).length - 1);
    }
  });
});
