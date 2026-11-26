/**
 * This module decodes the character references of HTML content, with no DOM. The table of the named references has
 * 2231 names. It is in a separate entry, so a bundle that only scans HTML does not get the table.
 */
import { NAMED_REFERENCES } from "./html-references.ts";
import { scanHtml } from "./html.ts";

/**
 * The values of the code points 0x80 to 0x9F in a numeric character reference, from the table of the standard. They are
 * the characters of windows-1252. The five code points that windows-1252 does not have stay as they are.
 */
const C1_VALUES =
  "\u20AC\u0081\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u008D\u017D\u008F" +
  "\u0090\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u009D\u017E\u0178";

/** The value of each named character reference. A name with `;` is a key, and a legacy name is also a key with no `;`. */
let named: Map<string, string> | undefined;
/** The length of the longest name, with no `;`. */
let longestName = 0;
/** The length of the longest legacy name. */
let longestLegacy = 0;

/** This function reads the table of the named character references one time, when the decoder first needs it. */
function namedReferences(): Map<string, string> {
  if (named !== undefined) return named;
  const table = new Map<string, string>();
  let point = 0;
  for (const group of NAMED_REFERENCES.split(/[,\n]/)) {
    const equals = group.indexOf("=");
    const [first = "", second] = group.slice(0, equals).split("+");
    point += parseInt(first, 36);
    const value = second === undefined ? String.fromCodePoint(point) : String.fromCodePoint(point, parseInt(second, 36));
    for (const entry of group.slice(equals + 1).split(" ")) {
      const legacy = entry.endsWith("*");
      const name = legacy ? entry.slice(0, -1) : entry;
      table.set(`${name};`, value);
      longestName = Math.max(longestName, name.length);
      if (legacy) {
        table.set(name, value);
        longestLegacy = Math.max(longestLegacy, name.length);
      }
    }
  }
  named = table;
  return table;
}

/** This function tells if a code unit is an ASCII letter or an ASCII digit. */
const isAlphanumeric = (code: number): boolean => (code >= 0x30 && code <= 0x39) || ((code | 0x20) >= 0x61 && (code | 0x20) <= 0x7a);

/** This function gives the value of a code unit as a decimal or a hexadecimal digit, or -1 for a different code unit. */
function digitOf(code: number, hex: boolean): number {
  if (code >= 0x30 && code <= 0x39) return code - 0x30;
  const lower = code | 0x20;
  return hex && lower >= 0x61 && lower <= 0x66 ? lower - 0x61 + 10 : -1;
}

/** A character reference that the decoder found: its value, and the index after its last character. */
interface Reference {
  readonly value: string;
  readonly end: number;
}

/**
 * This function reads the numeric character reference at the "&" at `amp`, with the fixes of the standard. It gives
 * undefined when no digit follows "&#" or "&#x".
 */
function readNumeric(text: string, amp: number): Reference | undefined {
  let at = amp + 2;
  const hex = (text.charCodeAt(at) | 0x20) === 0x78;
  if (hex) at += 1;
  const start = at;
  let point = 0;
  for (let digit = digitOf(text.charCodeAt(at), hex); digit !== -1; digit = digitOf(text.charCodeAt(at), hex)) {
    // A value above 0x10FFFF stays at 0x110000. Thus a long run of digits does not make a number that is too large.
    point = Math.min(point * (hex ? 16 : 10) + digit, 0x110000);
    at += 1;
  }
  if (at === start) return undefined;
  if (text.charCodeAt(at) === 0x3b) at += 1;
  if (point === 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return { value: "\uFFFD", end: at };
  if (point >= 0x80 && point <= 0x9f) return { value: C1_VALUES.charAt(point - 0x80), end: at };
  return { value: String.fromCodePoint(point), end: at };
}

/**
 * This function reads the named character reference at the "&" at `amp`. The longest name wins. It gives undefined when
 * no name of the table follows the "&".
 */
function readNamed(text: string, amp: number): Reference | undefined {
  const from = amp + 1;
  if (!isAlphanumeric(text.charCodeAt(from))) return undefined;
  const table = namedReferences();
  // A run of letters and digits that is longer than the longest name is not a name. Thus each "&" reads few characters.
  let at = from;
  while (at - from <= longestName && isAlphanumeric(text.charCodeAt(at))) at += 1;
  if (text.charCodeAt(at) === 0x3b) {
    const value = table.get(text.slice(from, at + 1));
    if (value !== undefined) return { value, end: at + 1 };
  }
  // With no `;`, only a legacy name can match: the longest legacy name at the start of the run.
  for (let end = Math.min(at, from + longestLegacy); end > from; end -= 1) {
    const value = table.get(text.slice(from, end));
    if (value !== undefined) return { value, end };
  }
  return undefined;
}

/**
 * This function decodes the character references of a text, as the tokenizer of the HTML Living Standard does in the
 * content of an element. Use it on the `text` of a scan of `scanHtml`.
 *
 * - A named reference gets its value from the table of the standard. The longest name wins.
 * - A legacy name, for example `&amp` or `&not`, is also correct with no semicolon. Thus `&notit;` gives `¬it;`.
 * - A decimal or hexadecimal reference, for example `&#8217;` or `&#x2019;`, gives its code point. The semicolon is optional.
 * - The value 0, a surrogate and a value above `0x10FFFF` give U+FFFD.
 * - The values `0x80` to `0x9F` give the characters of windows-1252, from the table of the standard.
 * - An ampersand with no reference after it stays as text. The function changes no other character.
 *
 * The function does not throw, and it is linear in the length of the text. The result is not longer than the text.
 *
 * @param text - The text of HTML content, with its character references.
 * @returns The text with the value of each character reference in place of the reference.
 */
export function decodeReferences(text: string): string {
  let amp = text.indexOf("&");
  if (amp === -1) return text;
  const parts: string[] = [];
  let at = 0;
  while (amp !== -1) {
    const reference = text.charCodeAt(amp + 1) === 0x23 ? readNumeric(text, amp) : readNamed(text, amp);
    if (reference === undefined) amp = text.indexOf("&", amp + 1);
    else {
      parts.push(text.slice(at, amp), reference.value);
      at = reference.end;
      amp = text.indexOf("&", at);
    }
  }
  parts.push(text.slice(at));
  return parts.join("");
}

/**
 * This function gives the plain text of a part of HTML, for a summary or a pattern. It is `scanHtml`, then `decodeReferences`.
 *
 * - The scan removes the tags, and it skips scripts, styles and templates.
 * - Each character reference gives its value. A reference to `<` gives text, not a tag.
 * - Each run of white space becomes one space, and the text has no space at its start or its end.
 * - `undefined`, and a text that is empty after these steps, give `undefined`.
 *
 * The function does not throw, and it is linear in the length of the HTML. The result is not safe HTML: escape it before a page shows it.
 *
 * @param html - The HTML, or `undefined` for a field that is not there.
 * @returns The plain text, or `undefined` when it is empty.
 */
export function plainText(html: string | undefined): string | undefined {
  if (html === undefined) return undefined;
  const text = decodeReferences(scanHtml(html).text).replace(/\s+/g, " ").trim();
  return text === "" ? undefined : text;
}
