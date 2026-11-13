/**
 * This module removes secrets from a text, for an error message or a log line. A secret goes into a text in more than
 * one form. The forms are the raw form, the forms of a URL and the form of an HTTP Basic credential. The module removes
 * each form.
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
