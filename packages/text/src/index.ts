/**
 * The entry of `@mark1russell7/text`: plain text helpers. The groups are the escapes for HTML, attributes, regular
 * expressions, Markdown and GitHub Actions workflow commands, the English word forms and a word search.
 */
export { countOf } from "./english.ts";
export { escapeAttribute, escapeHtml, escapeMarkdown, escapeRegExp, escapeWorkflowData, escapeWorkflowProperty } from "./escape.ts";
export { searchKey, wordSearch } from "./search.ts";
