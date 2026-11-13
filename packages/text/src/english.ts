/**
 * This module has the English word forms.
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
