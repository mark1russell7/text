/**
 * The model of the demos: each function uses the real functions of `@mark1russell7/text` and gives the result that
 * the page shows. The model has no DOM, so the tests examine it in Node.js.
 *
 * @packageDocumentation
 */
import { countOf, errorMessage, escapeRegExp, escapeWorkflowData, escapeWorkflowProperty, searchKey, wordSearch } from "@mark1russell7/text";
import { pad, textLength, truncate, type TextUnit } from "@mark1russell7/text/length";
import { redactSecrets, type Secret } from "@mark1russell7/text/redact";

// 2. Regular expressions

/** One match of a pattern in a text. */
export interface Match {
  readonly index: number;
  readonly text: string;
}

/** The matches of a pattern, or the message of the error of `new RegExp`. */
export interface Found {
  readonly pattern: string;
  readonly matches: readonly Match[];
  readonly error?: string;
}

/** This function finds each match of a pattern in a text, with the flag `g` only. An empty match does not count. */
export function findAll(pattern: string, text: string): Found {
  let expression: RegExp;
  try {
    expression = new RegExp(pattern, "g");
  } catch (error) {
    return { pattern, matches: [], error: errorMessage(error) };
  }
  const matches = [...text.matchAll(expression)].filter((match) => match[0] !== "").map((match) => ({ index: match.index, text: match[0] }));
  return { pattern, matches };
}

/** The search of a text with its raw pattern and with its escaped pattern. */
export function findText(find: string, text: string): { raw: Found; escaped: Found; literal: number } {
  let literal = 0;
  if (find !== "") for (let at = text.indexOf(find); at !== -1; at = text.indexOf(find, at + find.length)) literal += 1;
  return { raw: findAll(find, text), escaped: findAll(escapeRegExp(find), text), literal };
}

/** This function gives the parts of a text, with a flag on each part that a match covers. */
export function markParts(text: string, matches: readonly Match[]): { text: string; hit: boolean }[] {
  const parts: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (const match of matches) {
    if (match.index > at) parts.push({ text: text.slice(at, match.index), hit: false });
    parts.push({ text: match.text, hit: true });
    at = match.index + match.text.length;
  }
  if (at < text.length) parts.push({ text: text.slice(at), hit: false });
  return parts;
}

/** The count of matches as words, for example "1 match" or "3 matches". */
export function matchCount(count: number): string {
  return countOf(count, "match", "matches");
}

// 3. Workflow commands

/** What the runner of GitHub Actions reads from the first line of a workflow command. */
export interface CommandReading {
  readonly line: string;
  readonly lines: number;
  readonly properties: readonly (readonly [name: string, value: string])[];
  readonly message: string;
}

/** This function decodes a value as the runner does: `%25`, `%0D`, `%0A`, `%3A` and `%2C`. */
function decode(value: string): string {
  return value.replace(/%(?:25|0D|0A|3A|2C)/g, (code) => decodeURIComponent(code));
}

/**
 * This function reads a workflow command as the runner does. The runner reads only the first line. The properties end
 * at the first `::`, and a comma ends each property.
 */
export function readCommand(command: string): CommandReading {
  const lines = command.split(/\r\n|\r|\n/);
  const line = lines[0] ?? "";
  const body = line.replace(/^::warning ?/, "");
  const end = body.indexOf("::");
  const head = end === -1 ? "" : body.slice(0, end);
  const properties = head
    .split(",")
    .filter((part) => part !== "")
    .map((part) => {
      const equals = part.indexOf("=");
      return [equals === -1 ? part : part.slice(0, equals), equals === -1 ? "" : decode(part.slice(equals + 1))] as const;
    });
  return { line, lines: lines.length, properties, message: end === -1 ? "" : decode(body.slice(end + 2)) };
}

/** The command `warning` with a title and a message, with the raw texts and with the escaped texts. */
export function warningCommands(title: string, message: string): { raw: string; escaped: string } {
  return {
    raw: `::warning title=${title}::${message}`,
    escaped: `::warning title=${escapeWorkflowProperty(title)}::${escapeWorkflowData(message)}`,
  };
}

// 4. Length, cut and padding

let segmenter: Intl.Segmenter | undefined;

/** One grapheme of a text, with its count of code units and of code points. */
export interface Grapheme {
  readonly text: string;
  readonly start: number;
  readonly units: number;
  readonly points: number;
}

/** This function gives the graphemes of a text. */
export function graphemesOf(text: string): Grapheme[] {
  segmenter ??= new Intl.Segmenter("en", { granularity: "grapheme" });
  return [...segmenter.segment(text)].map(({ segment, index }) => ({
    text: segment,
    start: index,
    units: segment.length,
    points: textLength(segment, "code-point"),
  }));
}

/** The length of a text in each unit. */
export function lengths(text: string): Record<TextUnit, number> {
  return { "code-unit": textLength(text, "code-unit"), "code-point": textLength(text, "code-point"), grapheme: textLength(text, "grapheme") };
}

/** This function tells if a position of a code unit is inside a grapheme, not at its start or its end. */
export function breaksGrapheme(text: string, position: number): boolean {
  return graphemesOf(text).some((each) => position > each.start && position < each.start + each.units);
}

/** The cut of a text by `slice` and by `truncate`. */
export interface Cut {
  readonly slice: string;
  readonly sliceBreaks: boolean;
  readonly truncated: string;
}

/** This function cuts a text to `max` units: with `String.prototype.slice` and the ellipsis, and with `truncate`. */
export function cutText(text: string, max: number, unit: TextUnit): Cut {
  const slice = text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
  return { slice, sliceBreaks: text.length > max && breaksGrapheme(text, Math.max(0, max - 1)), truncated: truncate(text, max, { unit }) };
}

/** The fill of a text by `padEnd` or `padStart`, and by `pad`. `String` has no fill at the two sides. */
export interface Fill {
  readonly native: string | undefined;
  readonly padded: string;
  readonly nativeBreaks: boolean;
  readonly error?: string;
}

/** This function fills a text to a width, with the functions of `String` and with `pad`. */
export function fillText(text: string, width: number, fill: string, side: "start" | "end" | "both", unit: TextUnit): Fill {
  const native = side === "both" ? undefined : side === "start" ? text.padStart(width, fill) : text.padEnd(width, fill);
  // The last copy of the fill is the start of the fill, with the rest of the count.
  const rest = native === undefined || fill === "" ? 0 : (native.length - text.length) % fill.length;
  const nativeBreaks = rest !== 0 && breaksGrapheme(fill, rest);
  try {
    return { native, nativeBreaks, padded: pad(text, width, { unit, fill, side }) };
  } catch (error) {
    return { native, nativeBreaks, padded: text, error: errorMessage(error) };
  }
}

// 5. Word search

/** The rows of the search demo. */
export const SEARCH_ROWS: readonly string[] = [
  "Straße und Garten",
  "STRASSE 12, Berlin",
  "The ﬁnal report",
  "Ｆｕｌｌ ｗｉｄｔｈ ｔｅｘｔ",
  "ΟΔΥΣΣΕΥΣ and the sea",
  "Party at the art museum",
  "Café menu",
  "A naïve plan",
  "Report for 2026",
];

/** One row of the search, with the verdict of `wordSearch` and of `toLowerCase` with `includes`. */
export interface SearchRow {
  readonly text: string;
  readonly words: boolean;
  readonly plain: boolean;
}

/** This function searches the rows with `wordSearch`, and with `toLowerCase` and `includes`. */
export function searchRows(query: string, rows: readonly string[] = SEARCH_ROWS): { key: string; rows: SearchRow[]; words: string; plain: string } {
  const test = wordSearch(query);
  const lower = query.toLowerCase();
  const results = rows.map((text) => ({ text, words: test(text), plain: text.toLowerCase().includes(lower) }));
  return {
    key: searchKey(query),
    rows: results,
    words: matchCount(results.filter((row) => row.words).length),
    plain: matchCount(results.filter((row) => row.plain).length),
  };
}

// 6. Secrets

/** The mark of a leak in the demo. A leak is a form of a secret that a cut with `replaceAll` leaves. */
export const LEAK = "[leak]";

/** The secrets of the demo: a token, and a user with a password. */
export interface DemoSecrets {
  readonly token: string;
  readonly user: string;
  readonly password: string;
}

/** The Base64 form of the UTF-8 bytes of a text. */
function base64(text: string): string {
  return btoa(Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join(""));
}

/** This function writes a log with the secrets in four forms: raw, in a URL, in a form body and in a Basic header. */
export function sampleLog(secrets: DemoSecrets): string {
  const form = new URLSearchParams({ user: secrets.user, password: secrets.password }).toString();
  return [
    `GET https://api.example/v1/items?key=${encodeURIComponent(secrets.token)} failed: 401`,
    `Authorization: Basic ${base64(`${secrets.user}:${secrets.password}`)}`,
    `POST /login ${form}`,
    `The retry uses the token ${secrets.token}`,
  ].join("\n");
}

/** The secrets of the demo for `redactSecrets`. */
export function secretsOf(secrets: DemoSecrets): Secret[] {
  return [secrets.token, { user: secrets.user, password: secrets.password }];
}

/** The log after `redactSecrets`, and after `replaceAll` of the raw secrets, with the leaks that `replaceAll` leaves. */
export function redactLog(log: string, secrets: DemoSecrets): { redacted: string; replaced: string; leaks: number } {
  const all = secretsOf(secrets);
  let replaced = log;
  for (const raw of [secrets.token, secrets.password]) if (raw !== "") replaced = replaced.replaceAll(raw, "[secret]");
  const marked = redactSecrets(replaced, all, { mark: LEAK });
  return { redacted: redactSecrets(log, all), replaced: marked, leaks: marked.split(LEAK).length - 1 };
}

// 7. Thrown values

/** The text of a thrown value by one method, or the message of the error that the method throws. */
export interface Reading {
  readonly text: string;
  readonly threw: boolean;
}

function readWith(read: () => string): Reading {
  try {
    return { text: read(), threw: false };
  } catch (error) {
    return { text: errorMessage(error), threw: true };
  }
}

/** The text of a thrown value by `errorMessage`, by `String`, and by `instanceof Error` and `message`. */
export function readThrown(value: unknown): { errorMessage: Reading; string: Reading; common: Reading } {
  return {
    errorMessage: readWith(() => errorMessage(value)),
    string: readWith(() => String(value)),
    common: readWith(() => (value instanceof Error ? value.message : String(value))),
  };
}

/** The thrown values of the demo. The page adds an error of another window. */
export function thrownValues(): Record<string, () => unknown> {
  return {
    "An Error": () => new Error("The disk is full."),
    "A text": () => "The disk is full.",
    "An object with a message": () => ({ message: "The disk is full.", code: "ENOSPC" }),
    "An object with no prototype": () => Object.assign(Object.create(null) as object, { code: 28 }),
    "A revoked Proxy": () => {
      const { proxy, revoke } = Proxy.revocable({}, {});
      revoke();
      return proxy;
    },
    null: () => null,
  };
}
