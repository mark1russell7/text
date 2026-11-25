import { describe, expect, it } from "vitest";
import { createPrinter, type TextSink } from "./print.ts";

/** A stream that keeps each write. */
function buffer(): TextSink & { readonly writes: string[]; readonly text: () => string } {
  const writes: string[] = [];
  return { writes, write: (text: string) => writes.push(text), text: () => writes.join("") };
}

// A token with the shape of a classic GitHub token: ghp_ and 36 letters and digits.
const TOKEN = `ghp_${"A1b2C3d4E5f6".repeat(3)}`;

describe("createPrinter", () => {
  it("writes each line with a new line, and an empty line with no text", () => {
    const out = buffer();
    const print = createPrinter({ out });
    print.line("ready");
    print.line();
    expect(out.writes).toEqual(["ready\n", "\n"]);
  });

  it("writes a table with its head, aligned columns and no spaces at the end of a line", () => {
    const out = buffer();
    createPrinter({ out }).table(
      [
        ["alerts", 82],
        ["fleet", 121],
        ["prep", 0],
      ],
      { head: ["repository", "src"], align: ["start", "end"] },
    );
    expect(out.text()).toBe(["repository  src", "alerts       82", "fleet       121", "prep          0", ""].join("\n"));
  });

  it("measures a cell in graphemes, and gives an empty cell for undefined and null", () => {
    const out = buffer();
    createPrinter({ out }).table([
      ["👍🏽", "a"],
      ["ab", undefined],
      [null, "c"],
    ]);
    expect(out.text()).toBe(["👍🏽   a", "ab", "    c", ""].join("\n"));
  });

  it("writes a failed status, a warning and an error to err, and the other states to out", () => {
    const out = buffer();
    const err = buffer();
    const print = createPrinter({ out, err });
    print.status("ok", "build");
    print.status("info", "3 files");
    print.status("warn", "slow");
    print.status("fail", "test: 2 errors");
    print.warn("the cache is old");
    print.error(new TypeError("bad input"), "read config");
    print.error("plain");
    expect(out.writes).toEqual(["OK   build\n", "INFO 3 files\n", "WARN slow\n"]);
    expect(err.writes).toEqual(["FAIL test: 2 errors\n", "warning: the cache is old\n", "read config: bad input\n", "plain\n"]);
  });

  it("writes errors to out when there is no err", () => {
    const out = buffer();
    createPrinter({ out }).error(new Error("boom"));
    expect(out.writes).toEqual(["boom\n"]);
  });

  it("does not throw for a thrown value whose text throws", () => {
    const err = buffer();
    const bad = Object.create(null) as object;
    expect(() => createPrinter({ out: buffer(), err }).error(bad)).not.toThrow();
    expect(err.writes).toEqual(["[object Object]\n"]);
  });

  it("writes JSON with two spaces", () => {
    const out = buffer();
    const print = createPrinter({ out });
    print.json({ a: [1] });
    print.json(undefined);
    expect(out.writes).toEqual(['{\n  "a": [\n    1\n  ]\n}\n', "undefined\n"]);
  });

  it("puts a mark in place of each known secret and each token shape, in each kind of write", () => {
    const out = buffer();
    const err = buffer();
    const print = createPrinter({ out, err, secrets: ["hunter22"] });
    print.line(`token ${TOKEN}`);
    print.table([["key", TOKEN]]);
    print.status("fail", `login hunter22`);
    print.warn(`the token ${TOKEN} ends soon`);
    print.error(new Error(`401 for ${TOKEN}`), "hunter22");
    print.json({ token: TOKEN });
    const all = out.text() + err.text();
    expect(all).not.toContain(TOKEN);
    expect(all).not.toContain("hunter22");
    expect(all.match(/\[secret\]/g)?.length).toBe(7);
  });
});
