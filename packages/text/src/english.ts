/**
 * This module has the English word forms: a count with a noun, and a list of parts. It is the entry
 * `@mark1russell7/text/english`. The root entry has only `countOf`.
 */

/**
 * This function gives a count with a noun, for example "1 site" or "1,024 sites". Only the count 1 takes the singular
 * noun. Each other count takes the plural noun, also 0 and -1. The count has the digit groups of English and at most
 * three decimal places.
 *
 * @param count - The number of things.
 * @param noun - The singular noun.
 * @param plural - The plural noun. The default is the singular noun with the letter "s" at the end.
 * @returns The count, a space and the noun.
 */
export function countOf(count: number, noun: string, plural = `${noun}s`): string {
  return `${count.toLocaleString("en")} ${count === 1 ? noun : plural}`;
}

/** The options of `listOf`. */
export interface ListOptions {
  /** The word before the last part. The default is "and". */
  readonly conjunction?: string;
  /** With true, a comma also goes before the conjunction in a list of three parts or more. The default is false. */
  readonly serialComma?: boolean;
}

/**
 * This function joins the parts into an English list, for example "a", "a and b" or "a, b and c". A comma and a space go
 * between the parts, and the conjunction goes before the last part. No part gives an empty text. The parts do not change.
 *
 * @param parts - The parts of the list, in their order.
 * @param options - The conjunction and the serial comma.
 * @returns The list as one text.
 */
export function listOf(parts: readonly string[], options: ListOptions = {}): string {
  const { conjunction = "and", serialComma = false } = options;
  if (parts.length < 2) return parts[0] ?? "";
  const comma = serialComma && parts.length > 2 ? "," : "";
  return `${parts.slice(0, -1).join(", ")}${comma} ${conjunction} ${parts[parts.length - 1]}`;
}
