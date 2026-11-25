/**
 * This module finds a passage in a text, for example a quote in the text of its source. The key of a text
 * (`passageKey`) makes the case, the quote marks, the dashes and the white space not significant. `findPassage` gives
 * the span of the passage in the text. Each function has no I/O.
 */

import { searchKey } from "./search.ts";

/** The quote marks that `passageKey` changes to the apostrophe: the single quotes, the low and the reversed single quotes, and the prime. */
const SINGLE_QUOTES = /[\u2018\u2019\u201A\u201B\u2032\u02BC]/gu;
/** The quote marks that `passageKey` changes to the double quote: the double quotes, the low and the reversed double quotes and the guillemets. NFKC changes a double prime to two primes. */
const DOUBLE_QUOTES = /[\u201C\u201D\u201E\u201F\u00AB\u00BB]/gu;
/** The dashes that `passageKey` changes to the hyphen-minus. They are the hyphen, the non-breaking hyphen, the figure dash, the en dash and the em dash, the bar and the minus sign. */
const DASHES = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/gu;
/** The characters with no width that `passageKey` removes: the soft hyphen, the zero-width space, the joiners and the byte order mark. */
const NO_WIDTH = /[\u00AD\u200B\u200C\u200D\u2060\uFEFF]/gu;
/** A grapheme of white space only. */
const SPACE = /^\s+$/u;

/** The grapheme segmenter of `passageKey` and `findPassage`. The module makes it one time, at the first use. */
let graphemeSegmenter: Intl.Segmenter | undefined;

/** The key of a text for a passage search, with the start and the end in the text of each code unit of the key. */
interface PassageParts {
  readonly key: string;
  readonly starts: readonly number[];
  readonly ends: readonly number[];
}

/** This function gives the key of a text and the place of each code unit of the key in the text. */
function passageParts(text: string): PassageParts {
  graphemeSegmenter ??= new Intl.Segmenter("en", { granularity: "grapheme" });
  let key = "";
  const starts: number[] = [];
  const ends: number[] = [];
  for (const { segment, index } of graphemeSegmenter.segment(text)) {
    // A joiner is a part of the grapheme before it, so the test of white space comes after the removal.
    const clean = segment.replace(NO_WIDTH, "");
    let part: string;
    if (clean === "") part = "";
    else if (SPACE.test(clean)) part = key === "" || key.endsWith(" ") ? "" : " ";
    else part = searchKey(clean).replace(SINGLE_QUOTES, "'").replace(DOUBLE_QUOTES, '"').replace(DASHES, "-");
    for (let unit = 0; unit < part.length; unit++) {
      starts.push(index);
      ends.push(index + segment.length);
    }
    key += part;
  }
  if (key.endsWith(" ")) return { key: key.slice(0, -1), starts: starts.slice(0, -1), ends: ends.slice(0, -1) };
  return { key, starts, ends };
}

/**
 * This function gives the key of a text for a passage search. `findPassage` compares the keys of two texts. The function
 * does these steps on each grapheme of the text:
 *
 * 1. It removes the characters with no width: the soft hyphen, the zero-width space, the joiners and the byte order mark.
 * 2. It applies `searchKey`. Thus the case of the letters and the NFKC forms are not significant.
 * 3. It changes each curly or low quote mark and each prime to the apostrophe or to the double quote. It changes each dash and the minus sign to the hyphen-minus.
 * 4. It changes each run of white space to one space, and it removes the white space at the start and at the end.
 *
 * Accents and punctuation stay. A hyphen at the end of a line stays, because the function cannot tell it from a real hyphen.
 *
 * @param text - The plain text.
 * @returns The key of the text.
 */
export function passageKey(text: string): string {
  return passageParts(text).key;
}

/** The place of a passage in a text, in UTF-16 code units. The passage is `text.slice(start, end)`. */
export interface PassageSpan {
  readonly start: number;
  readonly end: number;
}

/**
 * This function finds a passage in a text, for example a quote in the text of its source. It has no I/O.
 *
 * - The text holds the passage when the key of the text (`passageKey`) contains the key of the passage.
 * - The result is the first place, from the start of the first grapheme to the end of the last grapheme of the match.
 * - A passage can start or end inside a word, as in `wordSearch`. The caller tests the edges when a word must be whole.
 * - A passage with an empty key, for example only white space, gives `undefined`. It is not a match at 0.
 *
 * @param text - The text to search, for example the text of a source.
 * @param passage - The passage, for example a quote.
 * @returns The span of the passage in the text, or `undefined` when the text does not hold it.
 */
export function findPassage(text: string, passage: string): PassageSpan | undefined {
  const needle = passageKey(passage);
  if (needle === "") return undefined;
  const parts = passageParts(text);
  const at = parts.key.indexOf(needle);
  if (at < 0) return undefined;
  return { start: parts.starts[at] ?? 0, end: parts.ends[at + needle.length - 1] ?? 0 };
}
