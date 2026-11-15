import { describe, expect, it } from "vitest";
import {
  LEAK,
  cutText,
  fillText,
  findText,
  graphemesOf,
  lengths,
  readCommand,
  readThrown,
  redactLog,
  sampleLog,
  searchRows,
  thrownValues,
  warningCommands,
} from "./model.ts";

describe("the regular expression demo", () => {
  it("finds the text itself with the escaped pattern, and other text with the raw pattern", () => {
    const text = "Is 1+1=2? Yes. And 11=2 is false.";
    const result = findText("1+1=2?", text);
    expect(result.literal).toBe(1);
    expect(result.escaped.matches.map((match) => match.text)).toEqual(["1+1=2?"]);
    expect(result.raw.matches.map((match) => match.text)).toEqual(["11=2"]);
  });

  it("gives the error of a raw pattern that is not a pattern", () => {
    const result = findText("(", "a ( b");
    expect(result.raw.error).toMatch(/group|parenthes/i);
    expect(result.escaped.matches).toEqual([{ index: 2, text: "(" }]);
  });
});

describe("the workflow command demo", () => {
  it("keeps the escaped command on one line with one property", () => {
    const { raw, escaped } = warningCommands("Build: failed, file=x.txt", "50% done\nthen stop");
    const rawReading = readCommand(raw);
    expect(rawReading.lines).toBe(2);
    expect(rawReading.properties).toEqual([
      ["title", "Build: failed"],
      [" file", "x.txt"],
    ]);
    expect(rawReading.message).toBe("50% done");
    const escapedReading = readCommand(escaped);
    expect(escapedReading.lines).toBe(1);
    expect(escapedReading.properties).toEqual([["title", "Build: failed, file=x.txt"]]);
    expect(escapedReading.message).toBe("50% done\nthen stop");
  });
});

describe("the length demo", () => {
  const text = "Cafe\u0301 👩‍👩‍👧 🇯🇵";

  it("counts each unit", () => {
    expect(lengths(text)).toEqual({ "code-unit": 19, "code-point": 14, grapheme: 8 });
    expect(graphemesOf(text).map((each) => each.units)).toEqual([1, 1, 1, 2, 1, 8, 1, 4]);
  });

  it("finds a cut by slice that breaks a grapheme, and truncate keeps it whole", () => {
    const cut = cutText(text, 9, "code-unit");
    expect(cut.sliceBreaks).toBe(true);
    expect(cut.slice).toBe("Cafe\u0301 👩…");
    expect(cut.truncated).toBe("Cafe\u0301 …");
    expect(cutText(text, 99, "code-unit")).toEqual({ slice: text, sliceBreaks: false, truncated: text });
  });

  it("finds a fill by padEnd that breaks an emoji, and pad keeps it whole", () => {
    const fill = fillText("ab", 5, "🌟", "end", "code-unit");
    expect(fill.native).toBe("ab🌟\uD83C");
    expect(fill.nativeBreaks).toBe(true);
    expect(fill.padded).toBe("ab🌟");
    expect(fillText("ab", 5, "🌟", "both", "grapheme").native).toBeUndefined();
    expect(fillText("ab", 5, "", "end", "code-unit").error).toMatch(/fill/);
  });
});

describe("the search demo", () => {
  it("finds folded case, ligatures, full-width letters and words in any order", () => {
    const pick = (query: string): string[] => searchRows(query).rows.filter((row) => row.words).map((row) => row.text);
    expect(pick("strasse")).toEqual(["Straße und Garten", "STRASSE 12, Berlin"]);
    expect(pick("final")).toEqual(["The ﬁnal report"]);
    expect(pick("full width")).toEqual(["Ｆｕｌｌ ｗｉｄｔｈ ｔｅｘｔ"]);
    expect(pick("ΟΔΥΣ")).toEqual(["ΟΔΥΣΣΕΥΣ and the sea"]);
    expect(pick("art party")).toEqual(["Party at the art museum"]);
    expect(pick("cafe")).toEqual([]);
  });

  it("counts the rows of each search", () => {
    const result = searchRows("strasse");
    expect(result.words).toBe("2 matches");
    expect(result.plain).toBe("1 match");
  });
});

describe("the secrets demo", () => {
  const secrets = { token: "tok+en/1=", user: "ada", password: "p@ss w0rd!" };

  it("removes each form of each secret, and replaceAll leaves three", () => {
    const log = sampleLog(secrets);
    expect(log).toContain("tok%2Ben%2F1%3D");
    expect(log).toContain("Basic YWRhOnBAc3MgdzByZCE=");
    const result = redactLog(log, secrets);
    for (const form of ["tok+en", "tok%2B", "p@ss", "p%40ss", "YWRhOn"]) expect(result.redacted).not.toContain(form);
    expect(result.redacted.split("[secret]")).toHaveLength(5);
    expect(result.leaks).toBe(3);
    expect(result.replaced).toContain(LEAK);
  });
});

describe("the thrown value demo", () => {
  it("gives a text for each value, where String and instanceof throw", () => {
    const values = thrownValues();
    const read = (name: string): ReturnType<typeof readThrown> => readThrown(values[name]?.());
    expect(read("An Error").errorMessage.text).toBe("The disk is full.");
    expect(read("An object with a message").string.text).toBe("[object Object]");
    expect(read("An object with a message").errorMessage.text).toBe("The disk is full.");
    expect(read("An object with no prototype").string.threw).toBe(true);
    expect(read("An object with no prototype").errorMessage).toEqual({ text: "[object Object]", threw: false });
    const revoked = read("A revoked Proxy");
    expect(revoked.string.threw).toBe(true);
    expect(revoked.common.threw).toBe(true);
    expect(revoked.errorMessage).toEqual({ text: "[object]", threw: false });
  });
});
