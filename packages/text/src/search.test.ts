import { random } from "@mark1russell7/rigor-generators";
import { describe, expect, it } from "vitest";
import { strings } from "../test/strings.ts";
import { searchKey, wordSearch } from "./index.ts";

describe("searchKey", () => {
  it("folds the German sharp s, the capital sharp s and SS to ss", () => {
    expect(searchKey("Straße")).toBe("strasse");
    expect(searchKey("STRAẞE")).toBe("strasse");
    expect(searchKey("STRASSE")).toBe("strasse");
  });

  it("uses no Turkish rules: the dotted capital I keeps its dot, and the dotless i gives i", () => {
    expect(searchKey("İ")).toBe("i̇");
    expect(searchKey("İSTANBUL")).toBe("i̇stanbul");
    expect(searchKey("ı")).toBe("i");
    expect(searchKey("I")).toBe("i");
  });

  it("folds the small final sigma to the small sigma", () => {
    expect(searchKey("ΟΔΟΣ")).toBe("οδοσ");
    expect(searchKey("οδος")).toBe("οδοσ");
    expect(searchKey("ΟΔΟΣΑ")).toBe("οδοσα");
  });

  it("applies NFKC: ligatures, full-width letters and the two forms of an accent agree", () => {
    expect(searchKey("ﬁle")).toBe("file");
    expect(searchKey("Ａｂｃ")).toBe("abc");
    expect(searchKey("café")).toBe(searchKey("café"));
  });

  it("keeps accents", () => {
    expect(searchKey("café")).not.toBe(searchKey("cafe"));
  });

  it("gives the same key for a key, for each code point", { timeout: 60_000 }, () => {
    const unstable: number[] = [];
    for (let point = 0; point <= 0x10ffff; point += 1) {
      if (point >= 0xd800 && point <= 0xdfff) continue;
      const key = searchKey(String.fromCodePoint(point));
      if (searchKey(key) !== key) unstable.push(point);
    }
    expect(unstable).toEqual([]);
  });
});

describe("wordSearch", () => {
  it("finds a text that has each word, in any order and in any case", () => {
    const test = wordSearch("news WORLD");
    expect(test("World News Today")).toBe(true);
    expect(test("world of news")).toBe(true);
    expect(test("World Today")).toBe(false);
  });

  it("finds a word that is a part of a longer word", () => {
    expect(wordSearch("art")("Party Planner")).toBe(true);
  });

  it("agrees with each text for a search with no words", () => {
    expect(wordSearch("")("anything")).toBe(true);
    expect(wordSearch(" \t 　")("")).toBe(true);
  });

  it("splits the search at each run of white space, also a no-break space and an ideographic space", () => {
    const test = wordSearch("a b　　c");
    expect(test("c b a")).toBe(true);
    expect(test("a b")).toBe(false);
  });

  it("agrees across the German sharp s", () => {
    expect(wordSearch("strasse")("Hauptstraße 1")).toBe(true);
    expect(wordSearch("STRAẞE")("Hauptstrasse 1")).toBe(true);
  });

  it("finds the Turkish dotted capital I only with its dot", () => {
    expect(wordSearch("İstanbul")("İSTANBUL")).toBe(true);
    expect(wordSearch("istanbul")("İSTANBUL")).toBe(false);
    expect(wordSearch("istanbul")("ıstanbul")).toBe(true);
  });

  it("finds each text with a search of a part of it, in another case, on 2000 seeded strings", () => {
    const r = random("text/search");
    for (const text of strings("text/search", 2000)) {
      const points = [...text];
      const start = r.int(0, points.length);
      const part = points.slice(start, r.int(start, points.length)).join("");
      expect(wordSearch(part.toUpperCase())(text)).toBe(true);
      expect(wordSearch(part)(text.toLowerCase())).toBe(true);
    }
  });
});
