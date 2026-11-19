/**
 * The entry `@mark1russell7/text/shell`: the escape of a text for one word of a POSIX shell command. It is a separate
 * entry, so the root entry keeps its size.
 */

// The characters that a POSIX shell reads as plain word characters at each place of a word. It is the safe set of `shlex.quote` of Python.
const SAFE = /^[A-Za-z0-9_@%+=:,./-]+$/;

/**
 * This function escapes a text for one word of a POSIX shell command, for example an argument of a command in a script.
 * The shell reads the word as the text, with no expansion and no split into words.
 *
 * - A text of safe characters only (letters, digits and `_ @ % + = : , . / -`) stays as it is.
 * - Each other text goes in single quotes. Each single quote of the text becomes `'\''`.
 * - The empty text becomes `''`.
 *
 * A shell word cannot hold the NUL character. Thus the function throws a `RangeError` for a text with NUL.
 *
 * @param text - The plain text.
 * @returns One word that a POSIX shell reads as the text.
 */
export function escapeShell(text: string): string {
  if (text.includes("\0")) throw new RangeError("A shell word cannot hold the NUL character.");
  if (SAFE.test(text)) return text;
  return `'${text.replaceAll("'", "'\\''")}'`;
}
