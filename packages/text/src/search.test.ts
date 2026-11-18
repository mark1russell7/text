import { random } from "@mark1russell7/rigor-generators";
import { describe, expect, it } from "vitest";
import { strings } from "../test/strings.ts";
import { searchKey, wordSearch } from "./index.ts";
import { cosineSimilarity, inverseDocumentFrequency, rankDocuments, rankerOf, searchWords, termVector } from "./search.ts";

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

/** The words of the seeded corpora. A small list gives terms in many documents and terms in each document. */
const VOCABULARY = ["site", "page", "ask", "graph", "topic", "budget", "release", "gate", "inbox", "sorter", "word", "rank"];

/** This function gives a seeded corpus of 1 to 12 documents. Each document has 0 to 15 words. */
function corpusOf(r: ReturnType<typeof random>): string[][] {
  return Array.from({ length: r.int(1, 12) }, () => Array.from({ length: r.int(0, 15) }, () => r.pick(VOCABULARY)));
}

describe("searchWords", () => {
  it("gives the search keys of the words in their order, with no spaces and no punctuation", () => {
    expect(searchWords("The STRAẞE, the café: 42 pages!")).toEqual(["the", "strasse", "the", "café", "42", "pages"]);
    expect(searchWords("")).toEqual([]);
    expect(searchWords(" ,.! ")).toEqual([]);
  });

  it("removes the stop words, then the words that keep refuses, then applies stem", () => {
    const options = {
      stop: new Set(["the"]),
      keep: (word: string) => word.length >= 2 || /\d/u.test(word),
      stem: (word: string) => (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word),
    };
    expect(searchWords("The pages of a class, 7 asks", options)).toEqual(["page", "of", "class", "7", "ask"]);
  });

  it("gives the same words for a text and for its search key, on 2000 seeded strings", () => {
    for (const text of strings("text/search-words", 2000)) expect(searchWords(searchKey(text))).toEqual(searchWords(text));
  });
});

describe("inverseDocumentFrequency", () => {
  it("gives ln(N / df) in the plain form and ln((N + 1) / (df + 1)) + 1 in the smooth form", () => {
    const corpus = [["site", "page"], ["site"], ["site", "ask", "ask"], []];
    expect(inverseDocumentFrequency(corpus)).toEqual(new Map([["site", Math.log(4 / 3)], ["page", Math.log(4)], ["ask", Math.log(4)]]));
    expect(inverseDocumentFrequency(corpus, "smooth").get("site")).toBe(Math.log(5 / 4) + 1);
    expect(inverseDocumentFrequency([])).toEqual(new Map());
  });

  it("gives the weight 0 to a term in each document in the plain form, and 1 in the smooth form, on 500 seeded corpora", () => {
    const r = random("text/idf-each");
    for (let run = 0; run < 500; run++) {
      const corpus = corpusOf(r).map((document) => [...document, "each"]);
      expect(inverseDocumentFrequency(corpus).get("each")).toBe(0);
      expect(inverseDocumentFrequency(corpus, "smooth").get("each")).toBe(1);
      const q = termVector(["each", r.pick(VOCABULARY)], inverseDocumentFrequency(corpus));
      expect(q.has("each")).toBe(false);
    }
  });

  it("gives the same weights when the order of the documents changes, on 500 seeded corpora", () => {
    const r = random("text/idf-order");
    for (let run = 0; run < 500; run++) {
      const corpus = corpusOf(r);
      const shuffled = r.shuffle(corpus);
      for (const form of ["plain", "smooth"] as const) {
        const a = inverseDocumentFrequency(corpus, form);
        const b = inverseDocumentFrequency(shuffled, form);
        expect(new Map([...b].sort(([x], [y]) => (x < y ? -1 : 1)))).toEqual(new Map([...a].sort(([x], [y]) => (x < y ? -1 : 1))));
      }
    }
  });
});

describe("termVector and cosineSimilarity", () => {
  it("gives (1 + ln(tf)) × idf with a length of 1, and no term with a weight of 0", () => {
    const idf = new Map([["site", 2], ["page", 1], ["each", 0]]);
    const vector = termVector(["site", "site", "page", "each", "other"], idf);
    const site = (1 + Math.log(2)) * 2;
    const norm = Math.hypot(site, 1);
    expect([...vector.keys()]).toEqual(["site", "page"]);
    expect(vector.get("site")).toBeCloseTo(site / norm, 14);
    expect(vector.get("page")).toBeCloseTo(1 / norm, 14);
    expect(termVector(["each", "other"], idf)).toEqual(new Map());
  });

  it("gives a similarity from 0 to 1, the same in the two directions, and 1 for a vector with itself, on 500 seeded corpora", () => {
    const r = random("text/cosine");
    for (let run = 0; run < 500; run++) {
      const corpus = corpusOf(r);
      const idf = inverseDocumentFrequency(corpus, r.pick(["plain", "smooth"] as const));
      const a = termVector(r.pick(corpus), idf);
      const b = termVector(r.pick(corpus), idf);
      const ab = cosineSimilarity(a, b);
      expect(ab).toBeGreaterThanOrEqual(0);
      expect(ab).toBeLessThanOrEqual(1);
      expect(cosineSimilarity(b, a)).toBeCloseTo(ab, 12);
      if (a.size > 0) expect(cosineSimilarity(a, a)).toBeCloseTo(1, 12);
      expect(cosineSimilarity(a, a)).toBeLessThanOrEqual(1);
    }
  });

  it("clamps a sum over 1 to exactly 1, so a caller can compare a score with 1", () => {
    const v = new Map([["a", 0.6], ["b", 0.8000000000000002]]);
    expect(0.6 * 0.6 + 0.8000000000000002 * 0.8000000000000002).toBeGreaterThan(1);
    expect(cosineSimilarity(v, v)).toBe(1);
  });
});

describe("rankDocuments", () => {
  it("puts the documents in order for a query, and a tie keeps the order of the corpus", () => {
    const corpus = [["budget", "gate"], ["graph", "topic", "topic"], ["graph", "page"], ["release"]];
    const ranked = rankDocuments(corpus, ["topic", "graph"]);
    expect(ranked.map((score) => score.index)).toEqual([1, 2, 0, 3]);
    expect(ranked[2]?.score).toBe(0);
    expect(rankDocuments(corpus, ["word"]).map((score) => score.index)).toEqual([0, 1, 2, 3]);
  });

  it("gives each document the same score when the order of the corpus changes, on 500 seeded corpora", () => {
    const r = random("text/rank-order");
    for (let run = 0; run < 500; run++) {
      const corpus = corpusOf(r);
      const query = Array.from({ length: r.int(1, 5) }, () => r.pick(VOCABULARY));
      const order = r.shuffle(corpus.map((_, index) => index));
      const byIndex = (scores: readonly { index: number; score: number }[], map: (index: number) => number) =>
        new Map(scores.map((score) => [map(score.index), score.score]));
      const a = byIndex(rankDocuments(corpus, query), (index) => index);
      const b = byIndex(rankDocuments(order.map((index) => corpus[index]!), query), (index) => order[index]!);
      expect(b).toEqual(a);
    }
  });
});

describe("rankerOf", () => {
  it("gives the same scores as rankDocuments for each query, in each form, on 500 seeded corpora", () => {
    const r = random("text/ranker-of");
    for (let run = 0; run < 500; run++) {
      const corpus = corpusOf(r);
      const form = r.pick(["plain", "smooth"] as const);
      const rank = rankerOf(corpus, form);
      for (let q = 0; q < 3; q++) {
        const query = Array.from({ length: r.int(1, 5) }, () => r.pick(VOCABULARY));
        expect(rank(query)).toEqual(rankDocuments(corpus, query, form));
      }
    }
  });

  it("keeps the vectors of the corpus at the time of the call", () => {
    const corpus = [["graph", "topic"], ["release", "gate"]];
    const rank = rankerOf(corpus);
    const before = rank(["graph"]);
    corpus[0] = ["release"];
    expect(rank(["graph"])).toEqual(before);
    expect(before.map((score) => score.index)).toEqual([0, 1]);
    expect(before[0]?.score).toBeGreaterThan(0);
  });
});
