/**
 * This module removes secrets from a text, for an error message or a log line. A secret goes into a text in more than
 * one form. The forms are the raw form, the forms of a URL and the form of an HTTP Basic credential. The module removes
 * each form. It also finds the shapes of the tokens of known services, for a token that you do not know.
 */
import { escapeRegExp } from "./escape.ts";

/**
 * A secret to remove from a text. A string is a key, a token or a password. A pair of a user and a password is an HTTP
 * Basic credential: the function also removes the password and the Base64 form of `user:password`.
 */
export type Secret = string | { readonly user: string; readonly password: string };

/** The options of `redactSecrets`. */
export interface RedactOptions {
  /** The text in place of each secret. The default is `[secret]`. */
  readonly mark?: string;
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * The Base64 form of the UTF-8 bytes of a text, with the padding `=`, as RFC 4648 section 4 tells. A lone surrogate
 * gives the bytes of U+FFFD, as the encoders of the platforms do.
 */
function base64(text: string): string {
  const bytes = (encodeURIComponent(text.toWellFormed()).match(/%..|./g) ?? []).map((part) =>
    part.length === 3 ? Number.parseInt(part.slice(1), 16) : part.charCodeAt(0),
  );
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const [first = 0, second, third] = bytes.slice(index, index + 3);
    const group = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    out += BASE64.charAt(group >> 18) + BASE64.charAt((group >> 12) & 63);
    out += second === undefined ? "==" : BASE64.charAt((group >> 6) & 63) + (third === undefined ? "=" : BASE64.charAt(group & 63));
  }
  return out;
}

/**
 * The forms of a text in a URL: the raw form, the form of `encodeURIComponent` and the form of `URLSearchParams`. The
 * last form goes into a query or the body of an HTML form. It also encodes `!'()~`, and it gives `+` for a space. A
 * lone surrogate is not in a URL, so the URL forms have U+FFFD in its place, as `URLSearchParams` does.
 */
function urlForms(text: string): string[] {
  const encoded = encodeURIComponent(text.toWellFormed());
  const form = encoded.replace(/[!'()~]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%20/g, "+");
  return [text, encoded, form];
}

/** Each form of a secret. */
function formsOf(secret: Secret): string[] {
  if (typeof secret === "string") return urlForms(secret);
  const credential = base64(`${secret.user}:${secret.password}`);
  return [...urlForms(secret.password), ...urlForms(credential)];
}

/**
 * This function removes each secret from a text, and puts a mark in its place. It removes these forms of each secret:
 *
 * - The raw form.
 * - The form of `encodeURIComponent`, for a secret in the path or the query of a URL.
 * - The form of `URLSearchParams`, for a secret in a query or in the body of an HTML form.
 * - For a pair of a user and a password, the forms of the password and of the Base64 form of `user:password`. This
 *   form is the value of an HTTP `Authorization: Basic` header.
 *
 * The function examines the text one time, from the start. At each position, it removes the longest form that agrees.
 * Thus a secret that contains a second secret goes as one mark. The function ignores an empty secret and an empty
 * password. The user of a pair stays, because a user name is not a secret. To remove the user, give it as a string also.
 *
 * @param text - The text, for example an error message.
 * @param secrets - The secrets to remove.
 * @param options - The mark in place of each secret.
 * @returns The text with a mark in place of each form of each secret.
 */
export function redactSecrets(text: string, secrets: readonly Secret[], options: RedactOptions = {}): string {
  const mark = options.mark ?? "[secret]";
  const forms = new Set<string>();
  for (const secret of secrets) {
    if ((typeof secret === "string" ? secret : secret.password) === "") continue;
    for (const form of formsOf(secret)) forms.add(form);
  }
  if (forms.size === 0) return text;
  const pattern = [...forms]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  return text.replace(new RegExp(pattern, "g"), () => mark);
}

/**
 * A shape of a token of a known service. A match of the pattern is a token, also when you do not know the secret. A
 * report gives `id` and `label`, never the token.
 */
export interface SecretShape {
  /** The name of the shape, for example `github-classic`. */
  readonly id: string;
  /** The words that tell a writer what the shape is. */
  readonly label: string;
  /** The pattern of a token of the shape. The functions add the flag `g` to a copy of it. */
  readonly pattern: RegExp;
}

/** A match of a shape in a text: the name of the shape and the span of the match. It does not hold the token. */
export interface SecretShapeMatch {
  /** The `id` of the shape. */
  readonly shape: string;
  /** The index of the first code unit of the match. */
  readonly start: number;
  /** The index after the last code unit of the match. */
  readonly end: number;
}

/** The options of `redactSecretShapes`. */
export interface RedactShapeOptions extends RedactOptions {
  /** The shapes to remove. The default is `SECRET_SHAPES`. */
  readonly shapes?: readonly SecretShape[];
}

/** A token starts at the start of the text, or after a character that is not a letter or a digit. */
const START = "(?<![A-Za-z0-9])";

/** This function makes a frozen shape. The pattern is `START` and then `body`, with the flags of `body`. */
function shapeOf(id: string, label: string, body: RegExp): SecretShape {
  return Object.freeze({ id, label, pattern: new RegExp(`${START}${body.source}`, body.flags) });
}

/**
 * The shapes of the tokens that `findSecretShapes` knows. Each pattern needs the full length of a token, so a prefix
 * alone in a sentence is not a match. A private key block goes to its end line, or to the end of the text.
 */
export const SECRET_SHAPES: readonly SecretShape[] = Object.freeze([
  shapeOf("github-fine-grained", "a fine-grained personal access token of GitHub", /github_pat_[A-Za-z0-9_]{82,}/),
  shapeOf("github-classic", "a classic personal access token of GitHub", /ghp_[A-Za-z0-9]{36,}/),
  shapeOf("github-oauth", "an OAuth access token of GitHub", /gho_[A-Za-z0-9]{36,}/),
  shapeOf("github-app-user", "a user access token of a GitHub App", /ghu_[A-Za-z0-9]{36,}/),
  shapeOf("github-app-installation", "an installation access token of a GitHub App", /ghs_[A-Za-z0-9]{36,}/),
  shapeOf("github-app-refresh", "a refresh token of a GitHub App", /ghr_[A-Za-z0-9]{36,}/),
  shapeOf("npm", "an access token of npm", /npm_[A-Za-z0-9]{36,}/),
  shapeOf("anthropic", "an API key of Anthropic", /sk-ant-[A-Za-z0-9_-]{32,}/),
  shapeOf("aws-access-key", "an access key ID of AWS", /(?:AKIA|ASIA)[A-Z0-9]{16}(?![A-Za-z0-9])/),
  shapeOf("slack", "a token of Slack", /xox[abposr]-[A-Za-z0-9-]{10,}/),
  shapeOf("bearer", "the value of an HTTP Bearer credential", /Bearer[ \t]+[A-Za-z0-9_.~+/-]{20,}=*/i),
  shapeOf(
    "private-key",
    "a private key block",
    /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?(?:-----END (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----|$)/,
  ),
]);

/** A copy of a pattern with the flag `g` and without the flag `y`, for `matchAll`. */
function globalCopy(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, `${pattern.flags.replace(/[gy]/g, "")}g`);
}

/**
 * This function finds each match of each shape in a text. Use it to refuse a text that holds a token before you write
 * or send the text. The matches are in the order of their start. At one start, the longer match comes first.
 *
 * @param text - The text, for example the answer to a form.
 * @param shapes - The shapes to find. The default is `SECRET_SHAPES`.
 * @returns Each match, with the name of its shape and its span. A text with no token gives an empty list.
 */
export function findSecretShapes(text: string, shapes: readonly SecretShape[] = SECRET_SHAPES): SecretShapeMatch[] {
  const matches: SecretShapeMatch[] = [];
  for (const shape of shapes) {
    for (const match of text.matchAll(globalCopy(shape.pattern))) {
      if (match[0] === "") continue;
      matches.push({ shape: shape.id, start: match.index, end: match.index + match[0].length });
    }
  }
  return matches.sort((left, right) => left.start - right.start || right.end - left.end);
}

/**
 * This function puts a mark in place of each match of each shape. Matches that overlap give one mark. Use it on a log
 * line or a message that can hold a token that you do not know.
 *
 * @param text - The text, for example the output of a command.
 * @param options - The mark in place of each match, and the shapes to remove.
 * @returns The text with a mark in place of each match.
 */
export function redactSecretShapes(text: string, options: RedactShapeOptions = {}): string {
  const mark = options.mark ?? "[secret]";
  let out = "";
  let at = 0;
  for (const match of findSecretShapes(text, options.shapes)) {
    if (match.end <= at) continue;
    if (match.start >= at) out += `${text.slice(at, match.start)}${mark}`;
    at = match.end;
  }
  return out + text.slice(at);
}

/** A match of a shape in a string of a value. It does not hold the token. */
export interface ValueShapeMatch extends SecretShapeMatch {
  /** The keys and the indexes from the value to the string. For a match in a key, the last part is that key. */
  readonly path: readonly (string | number)[];
  /** The value is `true` for a match in a key of an object, and `false` for a match in a string. */
  readonly inKey: boolean;
}

/** A node of the walk of `findSecretShapesInValue`, with a link to its parent. */
interface WalkNode {
  readonly value: unknown;
  readonly key: string | number | undefined;
  readonly parent: WalkNode | undefined;
}

function pathOf(node: WalkNode): (string | number)[] {
  const path: (string | number)[] = [];
  for (let at: WalkNode | undefined = node; at?.key !== undefined; at = at.parent) path.push(at.key);
  return path.reverse();
}

/**
 * This function finds each match of each shape in each string of a value: the value itself, the items of arrays, and
 * the keys and the values of objects. Use it on a JSON document. A scan of the JSON text misses a token after an
 * escape, for example a token at the start of a line. The function examines each object one time, in the order of
 * the document.
 *
 * @param value - The value, for example the body of a JSON document.
 * @param shapes - The shapes to find. The default is `SECRET_SHAPES`.
 * @returns Each match, with the path to its string. A value with no token gives an empty list.
 */
export function findSecretShapesInValue(value: unknown, shapes: readonly SecretShape[] = SECRET_SHAPES): ValueShapeMatch[] {
  const matches: ValueShapeMatch[] = [];
  const seen = new Set<object>();
  const stack: WalkNode[] = [{ value, key: undefined, parent: undefined }];
  while (stack.length > 0) {
    const node = stack.pop() as WalkNode;
    // A string key comes from an object. The index of an array is a number. The key comes before its value.
    if (typeof node.key === "string") {
      for (const match of findSecretShapes(node.key, shapes)) matches.push({ ...match, path: pathOf(node), inKey: true });
    }
    if (typeof node.value === "string") {
      for (const match of findSecretShapes(node.value, shapes)) matches.push({ ...match, path: pathOf(node), inKey: false });
      continue;
    }
    if (node.value === null || typeof node.value !== "object" || seen.has(node.value)) continue;
    seen.add(node.value);
    const entries: [string | number, unknown][] = Array.isArray(node.value) ? node.value.map((item, index) => [index, item]) : Object.entries(node.value);
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, item] = entries[index] as [string | number, unknown];
      stack.push({ value: item, key, parent: node });
    }
  }
  return matches;
}
