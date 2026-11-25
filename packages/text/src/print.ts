/**
 * The entry `@mark1russell7/text/print`: the printer of the output of a command-line tool for a person. It writes lines,
 * tables, status lines and the text of a thrown value to streams that the caller gives. Thus the entry imports no `node:`
 * module, and a test gives a buffer in place of a stream.
 *
 * The printer is for output that a person reads: the text, the tables and the status lines of a CLI. A diagnostic of a
 * library or a service (a warning, a debug line, a caught error) is not output. It goes to a log record with its trace
 * context, through the logger of OpenTelemetry, and not to a printer.
 */
import { errorMessage } from "./error.ts";
import { pad, textLength } from "./length.ts";
import { redactSecretShapes, redactSecrets, type Secret } from "./redact.ts";

/** A stream of text, for example `process.stdout`. The printer uses only its `write`. */
export interface TextSink {
  write(text: string): unknown;
}

/** The options of `createPrinter`. */
export interface PrinterOptions {
  /** The stream of the output, for example `process.stdout`. */
  readonly out: TextSink;
  /** The stream of the errors and warnings, for example `process.stderr`. The default is `out`. */
  readonly err?: TextSink;
  /** The known secrets, for example the tokens of the command. The printer puts a mark in place of each before a write. */
  readonly secrets?: readonly Secret[];
}

/** The side of a column of a table. `end` aligns the cells at the right, for numbers. */
export type ColumnAlign = "start" | "end";

/** The options of `Printer.table`. */
export interface TableOptions {
  /** The head of each column. The printer writes it as the first row. */
  readonly head?: readonly string[];
  /** The side of each column. The default is `start` for each column. */
  readonly align?: readonly ColumnAlign[];
  /** The text between two columns. The default is two spaces. */
  readonly gap?: string;
}

/** The state of a status line. */
export type StatusState = "ok" | "fail" | "warn" | "info";

/** A printer of the output of a command-line tool. */
export interface Printer {
  /** This function writes a line to `out`. No text gives an empty line. */
  line(text?: string): void;
  /** This function writes a table to `out`. A cell is any value, and `String` gives its text. */
  table(rows: readonly (readonly unknown[])[], options?: TableOptions): void;
  /** This function writes a status line to `out`, for example `FAIL build: 2 errors`. The state `fail` goes to `err`. */
  status(state: StatusState, text: string): void;
  /** This function writes a warning line to `err`. */
  warn(text: string): void;
  /** This function writes the text of a thrown value to `err`. It does not throw. A `context` comes before the text. */
  error(error: unknown, context?: string): void;
  /** This function writes a value as JSON with two spaces, to `out`. It throws as `JSON.stringify` does, for a bigint or a cycle. */
  json(value: unknown): void;
}

const MARKS: Readonly<Record<StatusState, string>> = { ok: "OK  ", fail: "FAIL", warn: "WARN", info: "INFO" };

/**
 * This function makes a printer that writes to the streams of `options`. Each write puts a mark in place of each known
 * secret and of each shape of a token (`redactSecretShapes`), and ends with a new line.
 *
 * @param options - The streams and the known secrets.
 * @returns The printer.
 */
export function createPrinter(options: PrinterOptions): Printer {
  const { out, err = out, secrets = [] } = options;
  const write = (sink: TextSink, text: string): void => {
    sink.write(`${redactSecretShapes(secrets.length > 0 ? redactSecrets(text, secrets) : text)}\n`);
  };
  return {
    line: (text = "") => write(out, text),
    table: (rows, table = {}) => {
      const { head, align = [], gap = "  " } = table;
      const cells = [...(head ? [head] : []), ...rows].map((row) => row.map((cell) => String(cell ?? "")));
      const widths: number[] = [];
      for (const row of cells) row.forEach((cell, at) => (widths[at] = Math.max(widths[at] ?? 0, textLength(cell, "grapheme"))));
      for (const row of cells) {
        const parts = row.map((cell, at) => pad(cell, widths[at] ?? 0, { unit: "grapheme", side: align[at] === "end" ? "start" : "end" }));
        // A line has no spaces at its end, also after an empty last cell.
        write(out, parts.join(gap).trimEnd());
      }
    },
    status: (state, text) => write(state === "fail" ? err : out, `${MARKS[state]} ${text}`),
    warn: (text) => write(err, `warning: ${text}`),
    error: (error, context) => write(err, context === undefined ? errorMessage(error) : `${context}: ${errorMessage(error)}`),
    json: (value) => write(out, JSON.stringify(value, null, 2) ?? String(value)),
  };
}
