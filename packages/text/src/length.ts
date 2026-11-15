/**
 * This module has three functions for a text: its length in a unit, a cut to a length and padding to a width. The
 * unit is a UTF-16 code unit, a Unicode code point or a grapheme. A grapheme is one character as a person sees it, for
 * example a letter with an accent, a flag or an emoji sequence.
 */

/**
 * The unit of a length. `code-unit` is the unit of `String.prototype.length`. `code-point` is one Unicode code point,
 * so a surrogate pair is one unit. `grapheme` is one extended grapheme cluster of Unicode (UAX #29).
 */
export type TextUnit = "code-unit" | "code-point" | "grapheme";

/**
 * The smallest part of a text that a cut or a fill keeps whole. The function uses the larger of this part and the unit,
 * so the unit `grapheme` keeps each grapheme whole with each boundary.
 */
export type TextBoundary = "code-point" | "grapheme";

/** The options of `truncate`. */
export interface TruncateOptions {
  /** The unit of the length `max`. The default is `code-unit`. */
  readonly unit?: TextUnit;
  /** The part of the text that the cut keeps whole. The default is `grapheme`. */
  readonly boundary?: TextBoundary;
  /** The text at the end of a text that the function cuts. The default is the ellipsis "…" (U+2026). */
  readonly mark?: string;
}

/** The options of `pad`. */
export interface PadOptions {
  /** The unit of the width. The default is `code-unit`. */
  readonly unit?: TextUnit;
  /** The part of the fill that the function keeps whole. The default is `grapheme`. */
  readonly boundary?: TextBoundary;
  /** The text that the function adds. It can have more than one unit. The default is one space. */
  readonly fill?: string;
  /**
   * The side of the fill. `both` puts the half of the fill at each side. For an odd count, the end gets one more unit.
   * The default is `end`.
   */
  readonly side?: "start" | "end" | "both";
}

let segmenter: Intl.Segmenter | undefined;

/** This function gives the parts of a text at a boundary, in their order. */
function* partsOf(text: string, boundary: TextBoundary): Generator<string> {
  if (boundary === "code-point") yield* text;
  else for (const { segment } of (segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" })).segment(text)) yield segment;
}

/** This function stops a bad option with a `RangeError` and its message. */
function check(good: boolean, message: string): void {
  if (!good) throw new RangeError(message);
}

/** This function stops a count that is not an integer of 0 or more. */
function checkCount(value: number, name: string): void {
  check(Number.isInteger(value) && value >= 0, `${name} is ${String(value)}, not an integer of 0 or more`);
}

/** This function stops a unit and a boundary that are not in their types, and gives the boundary to use. */
function boundaryOf(unit: TextUnit, boundary: TextBoundary): TextBoundary {
  check(unit === "code-unit" || unit === "code-point" || unit === "grapheme", `unit is ${String(unit)}, not code-unit, code-point or grapheme`);
  check(boundary === "code-point" || boundary === "grapheme", `boundary is ${String(boundary)}, not code-point or grapheme`);
  return unit === "grapheme" ? unit : boundary;
}

/**
 * This function gives the end of the longest start of a text that has `room` units or fewer. The end is at a boundary,
 * as an index of code units.
 */
function endOf(text: string, room: number, unit: TextUnit, boundary: TextBoundary): number {
  let size = 0;
  let end = 0;
  for (const part of partsOf(text, boundary)) {
    size += unit === "code-unit" ? part.length : unit === "code-point" ? [...part].length : 1;
    if (size > room) break;
    end += part.length;
  }
  return end;
}

/**
 * This function gives the length of a text in a unit.
 *
 * - `code-unit` gives `text.length`.
 * - `code-point` counts a surrogate pair as one unit, and a lone surrogate as one unit.
 * - `grapheme` counts the extended grapheme clusters of `Intl.Segmenter`. The rules of Unicode do not change with the
 *   locale.
 *
 * @param text - The text.
 * @param unit - The unit of the length. The default is `code-unit`.
 * @returns The count of units in the text.
 * @throws RangeError for a unit that is not in the type `TextUnit`.
 */
export function textLength(text: string, unit: TextUnit = "code-unit"): number {
  boundaryOf(unit, "code-point");
  if (unit === "code-unit") return text.length;
  let count = 0;
  for (const _ of partsOf(text, unit)) count += 1;
  return count;
}

/**
 * This function cuts a text to a length, and puts a mark at the end of the cut text. The result has `max` units or
 * fewer, with the mark.
 *
 * - A text with `max` units or fewer comes back as it is, with no mark.
 * - The cut keeps each part of `boundary` whole. The default part is the grapheme, so the cut does not break a flag,
 *   an emoji sequence or a letter with a combining mark. With `code-point`, the cut keeps only each surrogate pair
 *   whole.
 * - A part that does not fit in the length goes out with all the parts after it. Thus the result can be shorter
 *   than `max`.
 * - When the mark has more than `max` units, the result has no mark. It is the start of the text, with `max` units
 *   or fewer.
 *
 * @param text - The text to cut.
 * @param max - The most units in the result. It is an integer of 0 or more.
 * @param options - The unit, the boundary and the mark.
 * @returns The text, or the start of the text with the mark at the end.
 * @throws RangeError for a `max` that is not an integer of 0 or more, and for a bad unit or boundary.
 */
export function truncate(text: string, max: number, options: TruncateOptions = {}): string {
  const { unit = "code-unit", mark = "…" } = options;
  const boundary = boundaryOf(unit, options.boundary ?? "grapheme");
  checkCount(max, "max");
  // The count of code units is the largest count. Thus a text with `max` code units or fewer fits in each unit.
  if (text.length <= max || (unit !== "code-unit" && endOf(text, max, unit, unit) === text.length)) return text;
  const end = textLength(mark, unit) <= max ? mark : "";
  // A grapheme of the text can join a grapheme of the mark. A join gives fewer graphemes, never more (UAX #29).
  return text.slice(0, endOf(text, max - textLength(end, unit), unit, boundary)) + end;
}

/**
 * This function adds a fill to a text, at the start, at the end or at the two sides, to a width. The result has `width`
 * units or fewer.
 *
 * - A text with `width` units or more comes back as it is. The function does not cut a text.
 * - The fill goes again and again. The last copy of the fill can be a part of the fill, as in
 *   `String.prototype.padEnd`. That part keeps each part of `boundary` whole, so the function does not add a part of a
 *   grapheme by default.
 * - When the next part of the fill does not fit, the function stops. Thus the result can be shorter than `width`.
 *
 * @param text - The text.
 * @param width - The length of the result with the fill. It is an integer of 0 or more.
 * @param options - The unit, the boundary, the fill and the side.
 * @returns The text with the fill.
 * @throws RangeError for a `width` that is not an integer of 0 or more, for an empty fill, and for a bad unit, boundary
 *   or side.
 */
export function pad(text: string, width: number, options: PadOptions = {}): string {
  const { unit = "code-unit", fill = " ", side = "end" } = options;
  const boundary = boundaryOf(unit, options.boundary ?? "grapheme");
  checkCount(width, "width");
  check(side === "start" || side === "end" || side === "both", `side is ${String(side)}, not start, end or both`);
  const size = textLength(fill, unit);
  check(size > 0, "fill is an empty text");
  const missing = width - textLength(text, unit);
  if (missing <= 0) return text;
  const fillOf = (count: number): string => {
    const copies = Math.floor(count / size);
    return fill.repeat(copies) + fill.slice(0, endOf(fill, count - copies * size, unit, boundary));
  };
  const start = side === "start" ? missing : side === "end" ? 0 : Math.floor(missing / 2);
  return fillOf(start) + text + fillOf(missing - start);
}
