/**
 * This module has the text of a thrown value.
 */

/**
 * This function gives the text of a thrown value, for a log line or a message on a screen. It does not throw.
 *
 * - An object with a `message` text gives that text. The check reads the field, not `instanceof Error`, so an error
 *   from another realm (a `vm` context or an `iframe`) also gives its message.
 * - An `Error` with a `message` that is not a text gives `String(message)`. The brand check of
 *   `Object.prototype.toString` finds an `Error` of each realm.
 * - Each other value gives `String(value)`.
 * - When `String` throws, the function gives the tag of `Object.prototype.toString`, for example `[object Object]`.
 * - A revoked `Proxy` gives its `typeof` in brackets: `[object]`.
 *
 * @param error - The thrown value. It can be any value.
 * @returns The text of the value.
 */
export function errorMessage(error: unknown): string {
  try {
    if (typeof error === "object" && error !== null && "message" in error) {
      const message: unknown = error.message;
      if (typeof message === "string") return message;
      if (Object.prototype.toString.call(error) === "[object Error]") return String(message);
    }
    return String(error);
  } catch {
    // String() throws for an object with no prototype, for a toString that throws and for a message getter that throws.
    try {
      return Object.prototype.toString.call(error);
    } catch {
      // A revoked Proxy throws also here. The operator typeof never throws.
      return `[${typeof error}]`;
    }
  }
}
