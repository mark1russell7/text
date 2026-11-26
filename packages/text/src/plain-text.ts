/**
 * The plain text of a part of HTML: the entry `@mark1russell7/text/plain-text`. It is `scanHtml` of `./html`, then
 * `decodeReferences` of `./references`. It is its own entry, so `./references` does not get the scanner.
 */

import { scanHtml } from "./html.ts";
import { decodeReferences } from "./references.ts";

/**
 * This function gives the plain text of a part of HTML, for a summary or a pattern. It is `scanHtml`, then `decodeReferences`.
 *
 * - The scan removes the tags, and it skips scripts, styles and templates.
 * - Each tag gives one space, as in `scanHtml`. Thus `<b>3</b>,` gives `3 ,`, and two words in two elements stay two words.
 * - Each character reference gives its value. A reference to `<` gives text, not a tag.
 * - Each run of white space becomes one space, and the text has no space at its start or its end.
 * - `undefined`, and a text that is empty after these steps, give `undefined`.
 *
 * The function does not throw, and it is linear in the length of the HTML. The result is not safe HTML: escape it before a page shows it.
 *
 * @param html - The HTML, or `undefined` for a field that is not there.
 * @returns The plain text, or `undefined` when it is empty.
 */
export function plainText(html: string | undefined): string | undefined {
  if (html === undefined) return undefined;
  const text = decodeReferences(scanHtml(html).text).replace(/\s+/g, " ").trim();
  return text === "" ? undefined : text;
}
