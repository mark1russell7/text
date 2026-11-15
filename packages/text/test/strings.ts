/** The seeded strings of the tests: short strings with many characters that have a meaning in HTML, patterns and Markdown. */
import { random } from "@mark1russell7/rigor-generators";

/** The parts of a string. Each ASCII punctuation character is here, with letters, digits, line ends and other scripts. */
export const PARTS: readonly string[] = [
  ..."!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
  "a",
  "Z",
  "0",
  "9",
  " ",
  "    ",
  "\t",
  "\n",
  "\r",
  "\r\n",
  "é",
  "日本",
  "😀",
  "&amp;",
  "</p>",
];

/** This function gives `count` strings of 0 to 24 parts, from the seed `seed`. The same seed gives the same strings. */
export function strings(seed: string, count: number): string[] {
  const r = random(seed);
  return Array.from({ length: count }, () => Array.from({ length: r.int(0, 24) }, () => r.pick(PARTS)).join(""));
}

/**
 * The parts of a text for the tests of the lengths. Each part has a hard case of a grapheme: a surrogate pair, an emoji
 * sequence with a zero width joiner, a flag, combining marks, Hangul syllables and jamo, CRLF and an Indic conjunct. The
 * lone regional indicator joins with the next one into one flag.
 */
export const GRAPHEME_PARTS: readonly string[] = [
  "a",
  "Z",
  "0",
  " ",
  "  ",
  "\t",
  "\n",
  "\r\n",
  '"',
  "\\",
  "<",
  "\u00e9",
  "e\u0301",
  "a\u0308\u0323",
  "\u2026",
  "\u{1F600}",
  "\u{1F44D}\u{1F3FD}",
  "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
  "\u{1F3F3}\uFE0F\u200D\u{1F308}",
  "\u{1F1EF}\u{1F1F5}",
  "\u{1F1EB}\u{1F1F7}",
  "\u{1F1E6}",
  "\u2764\uFE0F",
  "1\uFE0F\u20E3",
  "\uD55C",
  "\u1100\u1161\u11A8",
  "\u0915\u094D\u0937",
  "\u65E5\u672C",
  "x\u200D",
];

/**
 * This function gives `count` texts of the parts `parts`, from the seed `seed`. The length of each text in code units is
 * near a random length of 0 to `2 * length + 8`, so the texts are shorter and longer than `length`.
 */
export function textsNear(seed: string, count: number, length: number, parts: readonly string[] = GRAPHEME_PARTS): string[] {
  const r = random(seed);
  return Array.from({ length: count }, () => {
    const target = r.int(0, 2 * length + 8);
    let text = "";
    while (text.length < target) text += r.pick(parts);
    return text;
  });
}

let segmenter: Intl.Segmenter | undefined;

/** This function gives the grapheme boundaries of a text, as indexes of code units. The set has 0 and the length. */
export function graphemeEnds(text: string): ReadonlySet<number> {
  const ends = new Set([0, text.length]);
  for (const { index } of (segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" })).segment(text)) ends.add(index);
  return ends;
}
