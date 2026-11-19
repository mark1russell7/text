/**
 * The entry of `@mark1russell7/text`: plain text helpers. The first group is the escapes for HTML, attributes, regular
 * expressions, Markdown, GitHub Actions workflow commands and POSIX shell words. The other groups are the English word forms, a word
 * search and the text of a thrown value. The entry `@mark1russell7/text/redact` removes secrets from a text, and the entry
 * `@mark1russell7/text/order` has two orders of texts. The entry `@mark1russell7/text/english` adds the list join `listOf`.
 * The entry `@mark1russell7/text/search` adds a ranked search with TF-IDF.
 */
export { countOf } from "./english.ts";
export { errorMessage } from "./error.ts";
export { escapeAttribute, escapeHtml, escapeMarkdown, escapeRegExp, escapeShell, escapeWorkflowData, escapeWorkflowProperty } from "./escape.ts";
export { searchKey, wordSearch } from "./search.ts";
