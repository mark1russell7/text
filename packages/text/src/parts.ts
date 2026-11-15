/**
 * This module divides a text into marked parts: the parts at ranges, or the parts at each copy of a text. A page puts a
 * `mark` element on each part with `hit`, and a terminal puts a color on it.
 */

/** A part of a text. A part with `hit` is in a range or is a copy of the text that the search found. */
export interface TextPart {
  readonly text: string;
  readonly hit: boolean;
}

/**
 * This function divides a text into parts at ranges of UTF-16 code units, `[start, end)`. Each range gives a part with
 * `hit`, and the text between the ranges gives parts with no `hit`. The function sorts the ranges, joins the ranges
 * that overlap, and clamps each range to the text. Two ranges that touch stay two parts. An empty range gives no part.
 *
 * The texts of the parts, in their order, make the text again.
 *
 * @param text - The text.
 * @param ranges - The ranges, as `[start, end)` in code units, in any order.
 * @returns The parts of the text, with no empty part.
 */
export function partsAt(text: string, ranges: readonly (readonly [start: number, end: number])[]): TextPart[] {
  const clamp = (n: number): number => Math.min(Math.max(Math.trunc(n), 0), text.length);
  const sorted = ranges
    .map(([start, end]) => [clamp(start), clamp(end)] as const)
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  const parts: TextPart[] = [];
  let at = 0;
  for (const [start, end] of sorted) {
    if (end <= at) continue;
    if (start < at) {
      const last = parts[parts.length - 1]!;
      parts[parts.length - 1] = { text: last.text + text.slice(at, end), hit: true };
    } else {
      if (start > at) parts.push({ text: text.slice(at, start), hit: false });
      parts.push({ text: text.slice(start, end), hit: true });
    }
    at = end;
  }
  if (at < text.length) parts.push({ text: text.slice(at), hit: false });
  return parts;
}

/**
 * This function divides a text into parts at each copy of `find`, from the start, with no overlap. Each copy gives a
 * part with `hit`. An empty `find` gives one part with no `hit`. The comparison is exact: the case and the
 * normalization of the letters are significant.
 *
 * @param text - The text.
 * @param find - The text to find.
 * @returns The parts of the text, with no empty part.
 */
export function partsOf(text: string, find: string): TextPart[] {
  if (find === "") return partsAt(text, []);
  const ranges: (readonly [number, number])[] = [];
  for (let at = text.indexOf(find); at >= 0; at = text.indexOf(find, at + find.length)) ranges.push([at, at + find.length]);
  return partsAt(text, ranges);
}
