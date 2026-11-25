import { random } from "@mark1russell7/rigor-generators";
import { describe, expect, it } from "vitest";
import { findPassage, passageKey } from "./passage.ts";

describe("passageKey", () => {
  it("folds the case, the quote marks, the dashes and the white space", () => {
    expect(passageKey("  \u201CBoil\u201D the\u00A0water \u2014 it\u2019s\n\tsafe.  ")).toBe('"boil" the water - it\'s safe.');
    expect(passageKey("\u00ABOui\u00BB \u201Elow\u201C \u2018a\u2019 6\u20327\u2033 \u22122 1\u20132")).toBe('"oui" "low" \'a\' 6\'7\'\' -2 1-2');
  });

  it("removes the characters with no width and keeps the accents", () => {
    expect(passageKey("pro\u00ADcess\u200B and\uFEFF caf\u00E9")).toBe("process and caf\u00E9");
    expect(passageKey("caf\u00E9")).not.toBe(passageKey("cafe"));
  });

  it("gives the same key for the key of a key", () => {
    const r = random("text/passage-key");
    const parts = ["A", "b", " ", "\n", "\u2019", "\u201C", "\u2014", "\u00AD", "\u200D", "\u00DF", "\uFB01", "e\u0301", "\u00A0", "-", "."];
    for (let run = 0; run < 500; run++) {
      const text = Array.from({ length: r.int(0, 20) }, () => r.pick(parts)).join("");
      expect(passageKey(passageKey(text)), JSON.stringify(text)).toBe(passageKey(text));
    }
  });
});

describe("findPassage", () => {
  const source = "Page 1-10\n\nUsing the process time for canning food at sea level may result in spoilage if you live at altitudes of 1,000 feet or more.\nWater boils at lower\ntemperatures as altitude increases.";

  it("finds a quote across a line break, in another case, and gives its span in the text", () => {
    const quote = "water boils at lower temperatures as altitude increases";
    const span = findPassage(source, quote);
    expect(span).toBeDefined();
    expect(source.slice(span!.start, span!.end)).toBe("Water boils at lower\ntemperatures as altitude increases");
  });

  it("finds a quote with curly quotes and dashes in a text with straight ones", () => {
    const text = 'He said "boil it - then cool it" and left.';
    const span = findPassage(text, "\u201Cboil it \u2013 then cool it\u201D");
    expect(text.slice(span!.start, span!.end)).toBe('"boil it - then cool it"');
  });

  it("gives the span of the whole grapheme for a key that expands", () => {
    const text = "Die Stra\u00DFe ist nass.";
    const span = findPassage(text, "STRASSE");
    expect(text.slice(span!.start, span!.end)).toBe("Stra\u00DFe");
  });

  it("gives undefined for a passage that the text does not hold, and for an empty passage", () => {
    expect(findPassage(source, "water boils at higher temperatures")).toBeUndefined();
    expect(findPassage(source, " \n ")).toBeUndefined();
    expect(findPassage("", "water")).toBeUndefined();
  });

  it("finds each passage that is a part of the text, on 500 seeded texts", () => {
    const r = random("text/find-passage");
    const parts = ["Boil ", "water", " \n", "\u2019s", "\u201Cit\u201D", " \u2014 ", "caf\u00E9", "\u00DF", ".", ","];
    for (let run = 0; run < 500; run++) {
      const text = Array.from({ length: r.int(1, 20) }, () => r.pick(parts)).join("");
      const from = r.int(0, text.length - 1);
      const to = r.int(from + 1, text.length);
      const passage = text.slice(from, to);
      const span = findPassage(text, passage);
      if (passageKey(passage) === "") {
        expect(span).toBeUndefined();
        continue;
      }
      expect(span, JSON.stringify([text, passage])).toBeDefined();
      // The span holds the passage again, so the span is a real place of the key in the text.
      expect(passageKey(text.slice(span!.start, span!.end)).includes(passageKey(passage)), JSON.stringify([text, passage])).toBe(true);
    }
  });
});
