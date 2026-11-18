/**
 * This module has a word search of plain text. A text agrees with a search when the text has each word of the search,
 * in any order. The case of the letters is not significant.
 *
 * The module also has a ranked search: the words of a text (`searchWords`), TF-IDF weights and the cosine similarity.
 * `rankDocuments` puts the documents of a corpus in order for a query. Each function has no I/O.
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

/** The options of `searchWords`. Each option is a rule of the caller, for example a list of stop words of a language. */
export interface WordOptions {
  /** The words that do not go in, as search keys. */
  readonly stop?: ReadonlySet<string>;
  /** The test of a word after the stop words. A word goes in only when the test gives true. */
  readonly keep?: (word: string) => boolean;
  /** The change of a word that goes in, for example a cut of a plural ending. */
  readonly stem?: (word: string) => string;
}

/**
 * This function gives the words of a text, in their order, for a ranked search. The function does these steps:
 *
 * 1. It makes the search key of the text with `searchKey`.
 * 2. It divides the key into word segments with `Intl.Segmenter` (Unicode Standard Annex 29). It keeps only the segments
 *    that are words or numbers, not spaces or punctuation.
 * 3. It removes each word of `options.stop`, then each word that `options.keep` refuses.
 * 4. It applies `options.stem` to each word that stays.
 *
 * @param text - The plain text.
 * @param options - The rules of the caller. With no options, each word goes in with no change.
 * @returns The words of the text.
 */
export function searchWords(text: string, options: WordOptions = {}): string[] {
  const out: string[] = [];
  for (const segment of new Intl.Segmenter("en", { granularity: "word" }).segment(searchKey(text))) {
    if (!segment.isWordLike) continue;
    const word = segment.segment;
    if (options.stop?.has(word) || (options.keep && !options.keep(word))) continue;
    out.push(options.stem ? options.stem(word) : word);
  }
  return out;
}

/**
 * The two forms of the inverse document frequency (IDF) of a term. N is the count of documents, and df is the count of
 * the documents that have the term.
 *
 * - `plain` is ln(N / df). A term in each document has the weight 0, so it does not change a rank.
 * - `smooth` is ln((N + 1) / (df + 1)) + 1, as scikit-learn computes it. Each term has a weight of 1 or more.
 */
export type IdfForm = "plain" | "smooth";

/**
 * This function gives the inverse document frequency of each term of a corpus. A document is a list of words, for
 * example from `searchWords`. A term counts one time in each document that has it.
 *
 * The weight of a term depends only on N and on its df. Thus the order of the documents does not change a weight.
 *
 * @param documents - The corpus.
 * @param form - The form of the IDF. The default is `plain`.
 * @returns The IDF of each term of the corpus.
 */
export function inverseDocumentFrequency(documents: readonly (readonly string[])[], form: IdfForm = "plain"): Map<string, number> {
  const df = new Map<string, number>();
  for (const document of documents) for (const term of new Set(document)) df.set(term, (df.get(term) ?? 0) + 1);
  const n = documents.length;
  return new Map([...df].map(([term, count]) => [term, form === "plain" ? Math.log(n / count) : Math.log((n + 1) / (count + 1)) + 1]));
}

/**
 * This function gives the TF-IDF vector of a list of words, with a length of 1.
 *
 * - The weight of a term is (1 + ln(tf)) × idf, where tf is the count of the term in the list.
 * - A term with a weight of 0, or with no IDF, is not in the vector.
 * - A list with no term of weight above 0 gives an empty vector.
 *
 * @param words - The words of a document or of a query.
 * @param idf - The IDF of each term, from `inverseDocumentFrequency`.
 * @returns The weight of each term, divided by the Euclidean length of the vector.
 */
export function termVector(words: readonly string[], idf: ReadonlyMap<string, number>): Map<string, number> {
  const tf = new Map<string, number>();
  for (const word of words) tf.set(word, (tf.get(word) ?? 0) + 1);
  const vector = new Map<string, number>();
  let norm = 0;
  for (const [term, count] of tf) {
    const weight = (1 + Math.log(count)) * (idf.get(term) ?? 0);
    if (weight > 0) {
      vector.set(term, weight);
      norm += weight * weight;
    }
  }
  norm = Math.sqrt(norm);
  if (norm > 0) for (const [term, weight] of vector) vector.set(term, weight / norm);
  return vector;
}

/**
 * This function gives the cosine similarity of two vectors with a length of 1, from `termVector`. The similarity is the
 * sum of the products of the weights of each term in the two vectors. It is 0 when the vectors have no term in common.
 *
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns The similarity, from 0 to 1 for vectors of `termVector`.
 */
export function cosineSimilarity(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): number {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let sum = 0;
  for (const [term, weight] of small) sum += weight * (large.get(term) ?? 0);
  return sum;
}

/** The score of one document of a corpus for a query. */
export interface DocumentScore {
  /** The position of the document in the corpus. */
  readonly index: number;
  /** The cosine similarity of the TF-IDF vectors of the document and of the query. */
  readonly score: number;
}

/**
 * This function ranks the documents of a corpus for a query with TF-IDF and the cosine similarity. It has no I/O.
 *
 * - The IDF comes from the corpus only. A term of the query that is not in the corpus has no weight.
 * - The result has one score for each document, from the best to the worst. A tie keeps the order of the corpus.
 * - The score of a document does not change when the order of the other documents changes.
 *
 * @param corpus - The documents, each as a list of words.
 * @param query - The words of the query.
 * @param form - The form of the IDF. The default is `plain`.
 * @returns The score of each document, best first.
 */
export function rankDocuments(corpus: readonly (readonly string[])[], query: readonly string[], form: IdfForm = "plain"): DocumentScore[] {
  const idf = inverseDocumentFrequency(corpus, form);
  const q = termVector(query, idf);
  return corpus.map((document, index) => ({ index, score: cosineSimilarity(q, termVector(document, idf)) })).sort((a, b) => b.score - a.score);
}
