// This script makes `packages/text/src/html-references.ts`, the table of the named character references of HTML.
// Start it with Node.js 24 or later, which runs TypeScript with no build step:
//
//   node scripts/html-references.ts                 (it gets https://html.spec.whatwg.org/entities.json)
//   node scripts/html-references.ts entities.json   (it reads a copy of that file)
//
// The table of the standard has each name with its "&". A legacy name is in the table two times: with and with no ";".
// The script writes each name one time, with no "&" and no ";", and a "*" when the name is correct with no ";". The
// names with the same value make one group. The groups are in the order of their values, and each group gives its
// first code point as the difference from the first code point of the group before it. Thus the module is small:
// about 7.4 kB with gzip, against 10.9 kB for a list of the names in the order of the names.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = "https://html.spec.whatwg.org/entities.json";
const TARGET = fileURLToPath(new URL("../packages/text/src/html-references.ts", import.meta.url));
/** The longest line of the table in the module, in characters. */
const WIDTH = 116;

interface Reference {
  readonly codepoints: readonly number[];
  readonly characters: string;
}

async function source(path: string | undefined): Promise<string> {
  if (path !== undefined) return readFileSync(path, "utf8");
  const response = await fetch(SOURCE, { headers: { "User-Agent": "text-dev", Accept: "application/json" } });
  if (!response.ok) throw new Error(`GET ${SOURCE}: HTTP ${response.status}`);
  return response.text();
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const raw = await source(process.argv[2]);
const table = JSON.parse(raw) as Record<string, Reference>;
const keys = Object.keys(table);

// The names with ";", each with its value and a mark for the legacy names that are also correct with no ";".
const names = new Map<string, { codepoints: readonly number[]; legacy: boolean }>();
for (const key of keys) {
  const match = /^&([A-Za-z0-9]+)(;?)$/.exec(key);
  if (match === null) throw new Error(`a name that is not letters and digits: ${JSON.stringify(key)}`);
  const { codepoints, characters } = table[key]!;
  if (String.fromCodePoint(...codepoints) !== characters) throw new Error(`the code points and the characters of ${key} do not agree`);
  if (codepoints.length < 1 || codepoints.length > 2) throw new Error(`${key} has ${codepoints.length} code points`);
  if (match[2] === ";") names.set(match[1]!, { codepoints, legacy: false });
}
let legacy = 0;
for (const key of keys) {
  if (key.endsWith(";")) continue;
  const name = key.slice(1);
  const full = names.get(name);
  // The encoding has one value for a name. Thus a legacy name must have the value of its form with ";".
  if (full === undefined) throw new Error(`the legacy name ${key} has no form with ";"`);
  if (full.codepoints.join() !== table[key]!.codepoints.join()) throw new Error(`the two forms of ${key} have different values`);
  names.set(name, { ...full, legacy: true });
  legacy += 1;
}
if (names.size + legacy !== keys.length) throw new Error(`${keys.length} names in the source, ${names.size + legacy} in the table`);

// The groups of the names with the same value, in the order of the values, and the names of a group in their order.
const groups = new Map<string, { codepoints: readonly number[]; names: string[] }>();
for (const name of [...names.keys()].sort(compare)) {
  const { codepoints, legacy: noSemicolon } = names.get(name)!;
  const key = codepoints.join("+");
  const group = groups.get(key) ?? { codepoints, names: [] };
  group.names.push(noSemicolon ? `${name}*` : name);
  groups.set(key, group);
}
const ordered = [...groups.values()].sort((a, b) => a.codepoints[0]! - b.codepoints[0]! || (a.codepoints[1] ?? -1) - (b.codepoints[1] ?? -1));
let previous = 0;
const entries = ordered.map(({ codepoints, names: group }) => {
  const [first, second] = codepoints as [number, number | undefined];
  const delta = first - previous;
  previous = first;
  return `${delta.toString(36)}${second === undefined ? "" : `+${second.toString(36)}`}=${group.join(" ")}`;
});
const lines: string[] = [];
let line = "";
for (const entry of entries) {
  if (line !== "" && line.length + 1 + entry.length > WIDTH) {
    lines.push(line);
    line = entry;
  } else line = line === "" ? entry : `${line},${entry}`;
}
lines.push(line);

const sha256 = createHash("sha256").update(raw, "utf8").digest("hex");
const longest = Math.max(...[...names.keys()].map((name) => name.length));
const longestLegacy = Math.max(...[...names].filter(([, value]) => value.legacy).map(([name]) => name.length));
const module = `/**
 * This module has the named character references of HTML. The script \`scripts/html-references.ts\` made it. Do not
 * edit it. Start the script again to make it.
 *
 * The source is the table of the HTML Living Standard, \`${SOURCE}\`. Copyright WHATWG
 * (Apple, Google, Mozilla, Microsoft). The table has the license CC BY 4.0,
 * \`https://creativecommons.org/licenses/by/4.0/\`. The SHA-256 of the source file is
 * \`${sha256}\`.
 *
 * The script changed the format of the table, not its content. The source has ${keys.length} names. ${legacy} of them are
 * legacy names, which are in the source with a semicolon and with no semicolon.
 */

/**
 * The names and the values of the named character references. The names with one value make one group. A comma or a
 * line end comes between two groups. Each group has these parts:
 *
 * - the first code point of the value, as the difference from the first code point of the group before it,
 * - a plus sign and the second code point, only for a value with two code points,
 * - an equals sign and the names of the group, with a space between two names.
 *
 * Each number is in base 36. A name has no ampersand and no semicolon. A star after a name tells that the name is also
 * correct with no semicolon. The groups are in the order of their values. The longest name has ${longest} characters, and the
 * longest legacy name has ${longestLegacy} characters.
 */
export const NAMED_REFERENCES: string =
  \`${lines.join("\n")}\`;
`;
writeFileSync(TARGET, module);
console.log(`${keys.length} names (${names.size} names with ";", ${legacy} legacy), ${groups.size} groups, sha256 ${sha256}, ${lines.length} lines, ${module.length} characters -> ${TARGET}`);
