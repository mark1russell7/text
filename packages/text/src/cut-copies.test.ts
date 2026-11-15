import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { describe, expect, it } from "vitest";
import { cutDifferences } from "../test/cut-differences.ts";
import { textsNear } from "../test/strings.ts";
import { truncate } from "./length.ts";

interface CutCopy {
  readonly id: string;
  readonly repo: string;
  readonly path: string;
  readonly line: number;
  readonly endLine: number;
  readonly commit: string;
  readonly url: string;
  readonly name: string;
  /** `text and length` gives the field `length` as the second argument. `json` gives the text, and the copy cuts its JSON form. */
  readonly call: "text" | "text and length" | "json";
  readonly length?: number;
  /** The `max` of the home call: the most code units in the output of the copy. */
  readonly max: number;
  /** The mark of the copy and of the home call. */
  readonly mark: string;
  readonly body: string;
  readonly context?: string;
}

const { copies } = JSON.parse(readFileSync(new URL("../test/cut-copies.json", import.meta.url), "utf8")) as { copies: readonly CutCopy[] };

// Each copy runs as its repository has it. The test removes only the types and the word `export`.
function run(copy: CutCopy): (text: string) => string {
  const source = [copy.context ?? "", copy.body.replace(/^\s*export\s+/, "")].join("\n");
  const make = new Function(`${stripTypeScriptTypes(source)}\nreturn ${copy.name};`) as () => (text: string, length?: number) => string;
  const fn = make();
  return copy.call === "text and length" ? (text) => fn(text, copy.length) : (text) => fn(text);
}

const subjectOf = (copy: CutCopy, text: string): string => (copy.call === "json" ? JSON.stringify(text) : text);

describe("the copies of a cut in the codeatlas list", () => {
  it("has 18 copies, each with its repository, path, commit, link and body", () => {
    expect(copies).toHaveLength(18);
    for (const copy of copies) {
      expect(copy.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(copy.body).toContain(copy.name);
      expect(copy.id).toBe(`${copy.repo}/${copy.path}:${copy.line}`);
      expect(copy.url).toBe(`https://github.com/mark1russell7/${copy.repo}/blob/${copy.commit}/${copy.path}#L${copy.line}-L${copy.endLine}`);
      expect(copy.call === "text and length", copy.id).toBe(copy.length !== undefined);
    }
  });

  it("lists each copy in at most one difference, and each listed id is a copy", () => {
    const listed = cutDifferences.flatMap((difference) => difference.copies);
    expect(new Set(listed).size).toBe(listed.length);
    const ids = new Set(copies.map((copy) => copy.id));
    for (const id of listed) expect(ids.has(id), id).toBe(true);
  });

  for (const copy of copies) {
    const texts = textsNear(`text/cuts/${copy.id}`, 400, copy.max);

    // The field max is a fact of the copy: the test reads it from the output of the copy.
    it(`${copy.id}: the longest output of the copy has max (${copy.max}) code units`, () => {
      const fn = run(copy);
      expect(Math.max(...texts.map((text) => fn(text).length))).toBe(copy.max);
    });

    it(`${copy.id} gives the output of truncate, or the committed difference`, () => {
      const fn = run(copy);
      const difference = cutDifferences.find((d) => d.copies.includes(copy.id));
      const to = difference?.to ?? ((home: string) => home);
      const when = difference?.when ?? (() => true);
      let differs = 0;
      for (const text of texts) {
        const subject = subjectOf(copy, text);
        const output = fn(text);
        const home = truncate(subject, copy.max, { mark: copy.mark });
        if (output !== home) differs += 1;
        if (when(subject, copy)) expect(output, JSON.stringify(text)).toBe(to(home));
      }
      // A difference in the list is real: the copy gives other output on at least one text
      if (difference === undefined) expect(differs).toBe(0);
      else expect(differs).toBeGreaterThan(0);
    });
  }
});
