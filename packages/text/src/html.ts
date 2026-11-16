/**
 * This module scans HTML for its text and its start tags, with no DOM. A check of a page reads the text that a reader with
 * no script gets. It also reads the elements of the page, for example an `h1` or a `link` with `rel="icon"`. The scan is
 * linear in the length of the HTML. Thus a page with many starts of a comment and no end does not stop it.
 */

/** A start tag that the scan found. */
export interface HtmlElement {
  /** The name of the element, in lower case. */
  readonly name: string;
  /**
   * The attributes of the start tag. Each name is in lower case. A value has no quotes, and its character references stay
   * as in the HTML. An attribute with no value has an empty value. When a tag has a name two times, the first value counts.
   */
  readonly attributes: Readonly<Record<string, string>>;
  /** The index of the "<" of the start tag in the HTML, in UTF-16 code units. */
  readonly start: number;
}

/** The result of a scan of HTML. */
export interface HtmlScan {
  /**
   * The text of the HTML outside the tags, the comments and the skipped elements. Each tag, comment and skipped element
   * gives one space, so two words in two elements stay two words. The white space and the character references stay as in the HTML.
   */
  readonly text: string;
  /** The start tags outside the comments and the skipped elements, in the order of the HTML. The start tag of a skipped element is in the list. */
  readonly elements: readonly HtmlElement[];
}

/** The options of `scanHtml`. */
export interface HtmlScanOptions {
  /** The names of the elements whose content gives no text and no element. The default is `HTML_SKIP`. */
  readonly skip?: readonly string[];
}

/** The elements that the scan skips by default. A script and a style hold code, not text, and a template is not on the page. */
export const HTML_SKIP: readonly string[] = Object.freeze(["script", "style", "template"]);

/**
 * The elements whose content has no tags. A "<" in a script, a title or a text area does not start a tag. The content of
 * such an element that the scan does not skip is text.
 */
const RAW_TEXT: readonly string[] = ["script", "style", "title", "textarea", "xmp", "iframe", "noembed", "noframes"];

/** This function tells if a character is white space in HTML: space, tab, line feed, form feed or carriage return. */
const isSpace = (char: string): boolean => char === " " || char === "\t" || char === "\n" || char === "\f" || char === "\r";

/** This function tells if a character ends the name of a tag: white space, "/", ">" or the end of the HTML. */
const endsName = (char: string): boolean => char === "" || char === "/" || char === ">" || isSpace(char);

/** A search for the first index of a text at or after a position, or -1. */
type Search = (needle: string, from: number) => number;

/**
 * This function gives a search in a source. A text that is not after a position is not after a later position either. Thus
 * the search keeps each failure and does not do it again, and a scan with many searches stays linear.
 */
function searchIn(source: string): Search {
  const missing = new Map<string, number>();
  return (needle, from) => {
    const least = missing.get(needle);
    if (least !== undefined && from >= least) return -1;
    const index = source.indexOf(needle, from);
    if (index === -1) missing.set(needle, from);
    return index;
  };
}

/** This function reads the start tag at `lt`. It gives undefined for a tag with no ">" after it. */
function readTag(html: string, lower: string, lt: number): { element: HtmlElement; end: number } | undefined {
  let at = lt + 1;
  while (!endsName(lower.charAt(at))) at += 1;
  const name = lower.slice(lt + 1, at);
  const attributes = new Map<string, string>();
  while (at < lower.length) {
    const char = lower.charAt(at);
    if (char === ">") return { element: { name, attributes: Object.fromEntries(attributes), start: lt }, end: at + 1 };
    if (char === "/" || isSpace(char)) {
      at += 1;
      continue;
    }
    // A name of an attribute ends at white space, "/", ">" or "=". A "=" at its start is a part of the name.
    const from = at;
    at += 1;
    while (!endsName(lower.charAt(at)) && lower.charAt(at) !== "=") at += 1;
    const key = lower.slice(from, at);
    let value = "";
    let next = at;
    while (isSpace(lower.charAt(next))) next += 1;
    if (lower.charAt(next) === "=") {
      next += 1;
      while (isSpace(lower.charAt(next))) next += 1;
      const quote = lower.charAt(next);
      if (quote === '"' || quote === "'") {
        const close = lower.indexOf(quote, next + 1);
        if (close === -1) return undefined;
        value = html.slice(next + 1, close);
        at = close + 1;
      } else {
        at = next;
        while (at < lower.length && lower.charAt(at) !== ">" && !isSpace(lower.charAt(at))) at += 1;
        value = html.slice(next, at);
      }
    }
    if (!attributes.has(key)) attributes.set(key, value);
  }
  return undefined;
}

/**
 * This function gives the start and the end of the end tag of `name` at or after `from`, or undefined. The name of the end
 * tag ends at white space, "/" or ">", and the tag ends at the next ">".
 */
function endTagOf(lower: string, name: string, from: number, search: Search): { start: number; end: number } | undefined {
  const needle = `</${name}`;
  for (let start = search(needle, from); start !== -1; start = search(needle, start + 1)) {
    if (!endsName(lower.charAt(start + needle.length)) || lower.charAt(start + needle.length) === "") continue;
    const gt = search(">", start + needle.length);
    return gt === -1 ? undefined : { start, end: gt + 1 };
  }
  return undefined;
}

/**
 * This function scans HTML for its text and its start tags, from the left to the right, in one pass.
 *
 * - A comment, a tag, a doctype and a processing instruction give no text. Each gives one space.
 * - The content of an element of `skip`, to its end tag, gives no text and no element.
 * - The content of a script, a style, a title or a text area that the scan does not skip is text with no tags.
 * - A "<" starts a tag only before a letter, "/", "!" or "?", as in HTML. Each other "<" is text, as in `1 < 2`.
 * - A comment or a skipped element with no end is text, and the scan continues in it. A tag with no ">" ends the scan,
 *   and the rest of the HTML is text.
 *
 * @param html - The HTML, a document or a part of one.
 * @param options - The elements to skip. The default is `HTML_SKIP`.
 * @returns The text and the start tags.
 */
export function scanHtml(html: string, options: HtmlScanOptions = {}): HtmlScan {
  const skip = new Set((options.skip ?? HTML_SKIP).map((name) => name.toLowerCase()));
  // Only A to Z go to lower case, so each index of the copy is an index of the HTML.
  const lower = html.replace(/[A-Z]+/g, (upper) => upper.toLowerCase());
  const search = searchIn(lower);
  const unclosed = new Set<string>();
  const parts: string[] = [];
  const elements: HtmlElement[] = [];
  let at = 0;
  for (let lt = search("<", 0); lt !== -1; lt = search("<", Math.max(at, lt + 1))) {
    const next = lower.charAt(lt + 1);
    let end: number;
    if (lower.startsWith("<!--", lt)) {
      // A comment can end at once: `<!-->` and `<!--->` are comments.
      const close = search("-->", lt + 2);
      if (close === -1) continue;
      end = close + 3;
    } else if (next === "/" || next === "!" || next === "?") {
      const gt = search(">", lt + 2);
      if (gt === -1) break;
      end = gt + 1;
    } else if (next >= "a" && next <= "z") {
      const tag = readTag(html, lower, lt);
      if (tag === undefined) break;
      elements.push(tag.element);
      end = tag.end;
      const { name } = tag.element;
      const skipped = skip.has(name);
      if ((skipped || RAW_TEXT.includes(name)) && !unclosed.has(name)) {
        const close = endTagOf(lower, name, end, search);
        if (close === undefined) unclosed.add(name);
        else {
          parts.push(html.slice(at, lt), " ");
          if (!skipped) parts.push(html.slice(end, close.start), " ");
          at = close.end;
          continue;
        }
      }
    } else continue;
    parts.push(html.slice(at, lt), " ");
    at = end;
  }
  parts.push(html.slice(at));
  return { text: parts.join(""), elements };
}
