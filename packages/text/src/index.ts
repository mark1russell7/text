/**
 * The entry of `@mark1russell7/text`: plain text helpers. The first group is the escapes for HTML, attributes, regular
 * expressions, Markdown and GitHub Actions workflow commands. The other groups are the English word forms, a word
 * search and the text of a thrown value. The entry `@mark1russell7/text/redact` removes secrets from a text.
 */
export { countOf } from "./english.ts";
export { errorMessage } from "./error.ts";
export { escapeAttribute, escapeHtml, escapeMarkdown, escapeRegExp, escapeWorkflowData, escapeWorkflowProperty } from "./escape.ts";
export { searchKey, wordSearch } from "./search.ts";
