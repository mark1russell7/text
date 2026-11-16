/**
 * This module has two orders of texts. Each order is the same in each locale and in each copy of a program. The name of
 * each function tells its unit, with the unit names of `TextUnit`. A grapheme has no order of its own, so no function
 * compares graphemes.
 */

/**
 * This function compares two texts by their UTF-16 code units. It gives -1, 0 or 1. The operator `<` and the default
 * `Array.prototype.sort` use this order. Canonical JSON (RFC 8785) sorts the keys of an object in this order.
 */
export function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const isHigh = (unit: number): boolean => unit >= 0xd800 && unit <= 0xdbff;
const isLow = (unit: number): boolean => unit >= 0xdc00 && unit <= 0xdfff;

/**
 * This function compares two texts by their Unicode code points. It gives -1, 0 or 1. A surrogate pair is one code point
 * above U+FFFF, and a lone surrogate is its own code point. The two orders are different only in one case. At the first code
 * point that is different, one text has a code point above U+FFFF. The other text has a lone surrogate or a code unit from
 * U+E000 to U+FFFF at that place.
 */
export function compareCodePoints(a: string, b: string): number {
  const end = Math.min(a.length, b.length);
  let index = 0;
  while (index < end && a.charCodeAt(index) === b.charCodeAt(index)) index += 1;
  if (index === end) return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
  // The first difference can be the low surrogate of a pair. Then the code point starts at the high surrogate before it.
  if (index > 0 && isHigh(a.charCodeAt(index - 1)) && (isLow(a.charCodeAt(index)) || isLow(b.charCodeAt(index)))) index -= 1;
  const x = a.codePointAt(index)!;
  const y = b.codePointAt(index)!;
  return x < y ? -1 : x > y ? 1 : 0;
}
