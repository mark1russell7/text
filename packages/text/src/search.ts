/**
 * This module has a word search of plain text. A text agrees with a search when the text has each word of the search,
 * in any order. The case of the letters is not significant.
 */

/** The small final sigma. Unicode case folding changes it to the small sigma, so a word agrees in each position. */
const FINAL_SIGMA = /ς/gu;

/**
 * This function gives the search key of a text. `wordSearch` compares the keys of texts. The function does these steps:
 *
 * 1. It applies the Unicode normalization NFKC. Thus the ligature "ﬁ" agrees with "fi", and full-width letters agree
 *    with ASCII letters.
 * 2. It applies the full lower case, then the full upper case, then the full lower case. Thus "ß", "ẞ" and "SS" give
 *    "ss".
 * 3. It changes the small final sigma "ς" to "σ", as Unicode case folding does.
 * 4. It applies NFKC again.
 *
 * The steps use no rules of a locale. Thus the Turkish "İ" gives "i" with a combining dot above (U+0307), and the
 * Turkish "ı" gives "i". The key of a key is the same key. Accents stay, so "é" does not agree with "e".
 *
 * @param text - The plain text.
 * @returns The search key of the text.
 */
export function searchKey(text: string): string {
  return text.normalize("NFKC").toLowerCase().toUpperCase().toLowerCase().replace(FINAL_SIGMA, "σ").normalize("NFKC");
}

/**
 * This function gives the test of a search. The function makes the key of the search with `searchKey`. Then it splits
 * the key into words at each run of white space, the class `\s` of a regular expression.
 *
 * The test tells if the key of a text contains each word, in any order. A word can be a part of a longer word, so the
 * search "art" finds "Party". A search with no words agrees with each text.
 *
 * @param query - The search, as a person types it.
 * @returns The test of a text.
 */
export function wordSearch(query: string): (text: string) => boolean {
  const words = searchKey(query)
    .split(/\s+/u)
    .filter((word) => word !== "");
  return (text) => words.length === 0 || words.every((word) => searchKey(text).includes(word));
}
