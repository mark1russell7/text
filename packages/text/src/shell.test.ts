import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { strings } from "../test/strings.ts";
import { escapeShell } from "./shell.ts";

// The round trip starts a real POSIX shell. Windows has no /bin/sh, so there the test shows as skipped, not as passed.
const SH = process.platform === "win32" ? undefined : "/bin/sh";
// No test string has this separator. printf writes it after each word, so the count of separators is the count of words.
const SEPARATOR = "\u0001";

/** This function starts `printf` in `sh -c` with the escaped texts as its arguments. It gives the words that the shell read. */
function shellWords(texts: readonly string[]): string[] {
  if (texts.length === 0) throw new Error("Give one text or more.");
  const script = `printf '%s\\001' ${texts.map(escapeShell).join(" ")}`;
  return execFileSync(SH ?? "sh", ["-c", script], { encoding: "utf8" }).split(SEPARATOR).slice(0, -1);
}

/** This function reads one word of the forms that `escapeShell` gives: safe characters, parts in single quotes and `\'`. */
function readWord(word: string): string {
  let text = "";
  let at = 0;
  while (at < word.length) {
    const char = word.charAt(at);
    if (char === "'") {
      const end = word.indexOf("'", at + 1);
      if (end < 0) throw new Error(`The word ${word} has no end quote.`);
      text += word.slice(at + 1, end);
      at = end + 1;
    } else if (word.startsWith("\\'", at)) {
      text += "'";
      at += 2;
    } else if (/^[A-Za-z0-9_@%+=:,./-]$/.test(char)) {
      text += char;
      at += 1;
    } else {
      throw new Error(`The word ${word} has the character ${JSON.stringify(char)} outside quotes.`);
    }
  }
  return text;
}

const HARD = ["'", '"', "$HOME", "$(echo no)", "`echo no`", "\\", "a\nb", "\r\n", "*", "~", "-n", "a'b'c", "\\'", "é", "日本", "😀", "!", "#x", ";", "&", "|", "<>", "( )", " ", "\t", ""];

describe("escapeShell", () => {
  it("keeps a text of safe characters, and quotes each other text", () => {
    expect(escapeShell("a-1.2_b/c:d,e=f+g%h@i")).toBe("a-1.2_b/c:d,e=f+g%h@i");
    expect(escapeShell("")).toBe("''");
    expect(escapeShell("a b")).toBe("'a b'");
    expect(escapeShell("it's")).toBe("'it'\\''s'");
    expect(escapeShell("$HOME")).toBe("'$HOME'");
    expect(escapeShell("'")).toBe("''\\'''");
  });

  it("refuses a text with NUL", () => {
    expect(() => escapeShell("a\0b")).toThrow(RangeError);
    expect(() => escapeShell("\0")).toThrow(RangeError);
  });

  it("gives one word that reads as the input, on the hard cases and 2000 seeded strings", () => {
    for (const text of [...HARD, ...strings("text/shell", 2000)]) expect(readWord(escapeShell(text)), JSON.stringify(text)).toBe(text);
  });

  it.skipIf(SH === undefined)("gives one word that sh -c reads as the input, on the hard cases and 1000 seeded strings", () => {
    expect(shellWords(HARD)).toEqual(HARD);
    const texts = strings("text/shell-run", 1000);
    // Each chunk stays far under the limit of one argument of Linux, 128 KiB.
    for (let start = 0; start < texts.length; start += 250) {
      const chunk = texts.slice(start, start + 250);
      expect(shellWords(chunk)).toEqual(chunk);
    }
  });
});
