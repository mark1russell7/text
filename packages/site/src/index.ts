/**
 * The demos of the home page. Each demo reads its controls, uses the model, and shows the result.
 *
 * @packageDocumentation
 */
import { byId, copyText, h, setupTheme } from "@mark1russell7/site-pages/chrome";
import { examples, markedText, setField, verdict } from "@mark1russell7/site-pages/demo";
import { countOf, escapeAttribute, escapeHtml, escapeMarkdown, escapeRegExp, escapeWorkflowData, escapeWorkflowProperty } from "@mark1russell7/text";
import type { TextUnit } from "@mark1russell7/text/length";
import { partsAt, partsOf } from "@mark1russell7/text/parts";
import {
  LEAK,
  cutText,
  fillText,
  findText,
  graphemesOf,
  lengths,
  matchCount,
  readCommand,
  readThrown,
  redactLog,
  sampleLog,
  searchRows,
  thrownValues,
  warningCommands,
  type Found,
  type Reading,
} from "./model.ts";

setupTheme(byId<HTMLButtonElement>("theme"), "theme");

const copy = byId<HTMLButtonElement>("copy");
copy.addEventListener("click", () => {
  void copyText(copy, byId("install").textContent ?? "");
});

/**
 * This function makes a group of radio buttons from the buttons with an attribute, and gives the value of each pick.
 * The `Segmented` part of `@mark1russell7/site-pages/chrome` replaces it when that part is on npm.
 */
function radios(attribute: string, start: string, pick: (value: string) => void): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>(`[${attribute}]`)];
  const select = (value: string): void => {
    for (const button of buttons) button.setAttribute("aria-checked", String(button.getAttribute(attribute) === value));
    pick(value);
  };
  for (const button of buttons) button.addEventListener("click", () => select(button.getAttribute(attribute) ?? start));
  select(start);
}

// 1. HTML

const parser = new DOMParser();

/** This function gives the names of the elements and the attributes that the parser made in a part of a document. */
function madeIn(root: Element, skip: Element): string {
  const made = [...root.querySelectorAll("*")].filter((element) => element !== skip);
  const attributes = [...root.querySelectorAll("*"), root].flatMap((element) => [...element.attributes].map((attribute) => attribute.name));
  const names = (list: readonly string[], one: string): string => {
    const unique = [...new Set(list)];
    return `${unique.length === 1 ? one : `${one}s`} ${unique.join(", ")}`;
  };
  const parts = [];
  if (made.length > 0) parts.push(`makes the ${names(made.map((element) => `<${element.localName}>`), "element")}`);
  const extra = attributes.filter((name) => name !== "title");
  if (extra.length > 0) parts.push(`adds the ${names(extra, "attribute")}`);
  return parts.join(" and ");
}

/** This function puts a version of the text in an element, and tells if the browser shows the text and nothing more. */
function inElement(html: string, text: string): { ok: boolean; reason: string } {
  const body = parser.parseFromString(`<!doctype html><body><div>${html}</div>`, "text/html").body;
  const wrapper = body.firstElementChild;
  if (wrapper === null) return { ok: false, reason: "The parser made no element." };
  const extra = madeIn(body, wrapper);
  if (extra !== "") return { ok: false, reason: `The parser ${extra}.` };
  const shown = body.textContent;
  return shown === text ? { ok: true, reason: "The browser shows your text, letter for letter." } : { ok: false, reason: `The browser shows another text: ${shown}` };
}

/** This function puts a version of the text in an attribute, and tells if the attribute keeps the text and nothing more. */
function inAttribute(value: string, text: string): { ok: boolean; reason: string } {
  const body = parser.parseFromString(`<!doctype html><body><a title="${value}">link</a>`, "text/html").body;
  const link = body.querySelector("a");
  if (link === null) return { ok: false, reason: "The parser made no link." };
  const title = link.getAttribute("title") ?? "";
  const extra = madeIn(body, link);
  if (extra !== "") return { ok: false, reason: `The title stops at “${title}”, and the parser ${extra}.` };
  return title === text ? { ok: true, reason: "The title is your text, letter for letter." } : { ok: false, reason: `The title is another text: ${title}` };
}

const htmlInput = byId<HTMLTextAreaElement>("html-input");
const VERSIONS = [
  ["The raw text", (text: string) => text],
  ["escapeHtml", escapeHtml],
  ["escapeAttribute", escapeAttribute],
] as const;
const ESCAPES = [
  ["out-html", escapeHtml],
  ["out-attribute", escapeAttribute],
  ["out-regexp", escapeRegExp],
  ["out-markdown", escapeMarkdown],
  ["out-workflow-data", escapeWorkflowData],
  ["out-workflow-property", escapeWorkflowProperty],
] as const;
function showHtml(): void {
  const text = htmlInput.value;
  byId("html-result").replaceChildren(
    ...VERSIONS.map(([name, version]) => {
      const content = inElement(version(text), text);
      const attribute = inAttribute(version(text), text);
      return h(
        "div",
        { class: "sp-card" },
        h("h3", {}, name === "The raw text" ? name : h("code", {}, name)),
        verdict(content.ok, "In an element:", content.reason),
        verdict(attribute.ok, "In an attribute:", attribute.reason),
      );
    }),
  );
  for (const [id, escape] of ESCAPES) byId(id).textContent = escape(text);
}
htmlInput.addEventListener("input", showHtml);
examples(
  byId("html-chips"),
  [
    ["A tag", 'Tom & Jerry say <b>"hi"</b>'],
    ["An element with a handler", "<svg onload=alert(1)>"],
    ["A quote", '" autofocus onfocus="alert(1)'],
    ["An entity", "Tom &amp; Jerry"],
    ["A plain name", "Ada Lovelace"],
  ],
  (value) => setField(htmlInput, value),
);
showHtml();

// 2. Regular expressions

const findInput = byId<HTMLInputElement>("find-text");
const findIn = byId<HTMLTextAreaElement>("find-in");

/** This function shows the result of one pattern. */
function foundBlock(title: string, found: Found, find: string, text: string, literal: number): HTMLElement {
  const exact = found.error === undefined && found.matches.length === literal && found.matches.every((match) => match.text === find);
  const listed = [...new Set(found.matches.map((match) => match.text))].join(", ");
  const reason =
    found.error !== undefined
      ? `new RegExp throws: ${found.error}`
      : exact
        ? `It finds ${matchCount(found.matches.length)}, and each one is your text.`
        : `It finds ${matchCount(found.matches.length)}${listed === "" ? "" : `: ${listed}`}. Your text is there ${countOf(literal, "time")}.`;
  return h(
    "div",
    { class: "sp-card" },
    h("h3", {}, title, " ", h("code", {}, `/${found.pattern}/g`)),
    verdict(exact, exact ? "Correct:" : "Wrong:", reason),
    found.error === undefined ? markedText(partsAt(text, found.matches.map((match) => [match.index, match.index + match.text.length] as const)), `The matches of ${title}`) : "",
  );
}
function showFind(): void {
  const find = findInput.value;
  const text = findIn.value;
  const result = findText(find, text);
  byId("find-result").replaceChildren(
    foundBlock("The raw pattern", result.raw, find, text, result.literal),
    foundBlock("escapeRegExp", result.escaped, find, text, result.literal),
  );
}
findInput.addEventListener("input", showFind);
findIn.addEventListener("input", showFind);
examples(
  byId("find-chips"),
  [
    ["1+1=2?", "1+1=2?"],
    ["(USD)", "(USD)"],
    ["a.b", "a.b"],
    ["[x]", "[x]"],
    ["C:\\path", "C:\\path"],
    ["An open (", "("],
  ],
  (value) => setField(findInput, value),
);
showFind();

// 3. Workflow commands

const wfTitle = byId<HTMLInputElement>("wf-title");
const wfMessage = byId<HTMLTextAreaElement>("wf-message");
function commandBlock(name: string, command: string, title: string, message: string): HTMLElement {
  const reading = readCommand(command);
  const others = reading.properties.filter(([property]) => property !== "title");
  const readTitle = reading.properties.find(([property]) => property === "title")?.[1] ?? "";
  const ok = reading.lines === 1 && others.length === 0 && readTitle === title && reading.message === message;
  const rows: [string, string][] = [
    ["Lines", reading.lines === 1 ? "1: the runner reads all of it" : `${String(reading.lines)}: the runner reads only the first line`],
    ["The title", readTitle === "" ? "(none)" : readTitle],
  ];
  if (others.length > 0) rows.push(["Other properties", others.map(([property, value]) => `${property.trim()}=${value}`).join(", ")]);
  rows.push(["The message", reading.message === "" ? "(none)" : reading.message]);
  return h(
    "div",
    { class: "sp-card" },
    h("h3", {}, name),
    h("pre", { class: "sp-text", "aria-label": `The command, ${name}` }, command),
    verdict(ok, ok ? "The runner reads your text:" : "The runner reads another text:", ok ? "The title and the message come back as you typed them." : "The title, the properties or the message changed."),
    h("dl", { class: "reading" }, ...rows.flatMap(([term, value]) => [h("dt", {}, term), h("dd", {}, value)])),
  );
}
function showWorkflow(): void {
  const { raw, escaped } = warningCommands(wfTitle.value, wfMessage.value);
  byId("wf-result").replaceChildren(
    commandBlock("The raw texts", raw, wfTitle.value, wfMessage.value),
    commandBlock("escapeWorkflowProperty and escapeWorkflowData", escaped, wfTitle.value, wfMessage.value),
  );
}
wfTitle.addEventListener("input", showWorkflow);
wfMessage.addEventListener("input", showWorkflow);
showWorkflow();

// 4. Length, cut and padding

const lenText = byId<HTMLInputElement>("len-text");
const cutMax = byId<HTMLInputElement>("cut-max");
const padWidth = byId<HTMLInputElement>("pad-width");
const padFill = byId<HTMLInputElement>("pad-fill");
const UNIT_NAMES: Readonly<Record<TextUnit, string>> = { "code-unit": "code units", "code-point": "code points", grapheme: "graphemes" };
let unit: TextUnit = "code-unit";
let side: "start" | "end" | "both" = "end";

/** This function shows a text in quotes, in a box that shows each space. */
function quoted(text: string, label: string): HTMLElement {
  return h("output", { class: "quoted", "aria-label": label }, text);
}

function showLength(): void {
  const text = lenText.value;
  const graphemes = graphemesOf(text);
  byId("len-graphemes").replaceChildren(
    ...graphemes.map((each) =>
      h("li", { class: each.units > 1 ? "wide" : "" }, h("span", { class: "glyph" }, each.text === " " ? "␠" : each.text), h("span", { class: "units" }, String(each.units))),
    ),
  );
  const counts = lengths(text);
  byId("len-counts").replaceChildren(
    ...(Object.keys(UNIT_NAMES) as TextUnit[]).flatMap((each) => [h("dt", {}, UNIT_NAMES[each]), h("dd", {}, String(counts[each]))]),
  );
  cutMax.max = String(Math.max(counts[unit] + 2, 4));
  if (Number(cutMax.value) > Number(cutMax.max)) cutMax.value = cutMax.max;
  showCut();
  showPad();
}
function showCut(): void {
  const text = lenText.value;
  const max = Number(cutMax.value);
  byId("cut-max-value").textContent = String(max);
  const cut = cutText(text, max, unit);
  byId("cut-result").replaceChildren(
    h("div", { class: "line" }, h("code", {}, `slice(0, ${String(Math.max(0, max - 1))}) + "…"`), quoted(cut.slice, "The cut by slice")),
    verdict(!cut.sliceBreaks, cut.sliceBreaks ? "Broken:" : "Whole:", cut.sliceBreaks ? "The cut is inside a grapheme, so the screen shows a broken character." : "Each grapheme is whole."),
    h("div", { class: "line" }, h("code", {}, `truncate(text, ${String(max)}, { unit: "${unit}" })`), quoted(cut.truncated, "The cut by truncate")),
    verdict(true, "Whole:", `Each grapheme is whole. The result has ${countOf(lengths(cut.truncated)[unit], UNIT_NAMES[unit].replace(/s$/, ""), UNIT_NAMES[unit])}.`),
  );
}
function showPad(): void {
  const width = Number(padWidth.value);
  byId("pad-width-value").textContent = String(width);
  const fill = fillText(lenText.value, width, padFill.value, side, unit);
  const parts: (HTMLElement | string)[] = [];
  if (fill.native !== undefined) {
    const method = side === "start" ? "padStart" : "padEnd";
    parts.push(
      h("div", { class: "line" }, h("code", {}, `${method}(${String(width)}, fill)`), quoted(fill.native, `The fill by ${method}`)),
      verdict(!fill.nativeBreaks, fill.nativeBreaks ? "Broken:" : "Whole:", fill.nativeBreaks ? "The last copy of the fill ends inside a grapheme." : "Each grapheme of the fill is whole."),
    );
  } else {
    parts.push(h("p", { class: "quiet" }, "String has no fill at the two sides."));
  }
  parts.push(
    h("div", { class: "line" }, h("code", {}, `pad(text, ${String(width)}, { unit: "${unit}", side: "${side}" })`), quoted(fill.padded, "The fill by pad")),
    fill.error === undefined ? verdict(true, "Whole:", "Each grapheme of the fill is whole.") : verdict(false, "RangeError:", fill.error),
  );
  byId("pad-result").replaceChildren(...parts);
}
lenText.addEventListener("input", showLength);
cutMax.addEventListener("input", showCut);
padWidth.addEventListener("input", showPad);
padFill.addEventListener("input", showPad);
examples(
  byId("len-chips"),
  [
    ["Flags", "🇯🇵🇫🇷🇧🇷 trip"],
    ["A family", "👩‍👩‍👧 family"],
    ["Accents", "Cafe\u0301 naïve résumé"],
    ["Hindi", "नमस्ते दुनिया"],
    ["Plain ASCII", "Hello world"],
  ],
  (value) => setField(lenText, value),
);
radios("data-side", "end", (value) => {
  side = value as typeof side;
  showPad();
});
radios("data-unit", "code-unit", (value) => {
  unit = value as TextUnit;
  showLength();
});

// 5. Word search

const searchQuery = byId<HTMLInputElement>("search-query");
function showSearch(): void {
  const result = searchRows(searchQuery.value);
  byId("search-key").textContent = result.key === "" ? "(empty)" : result.key;
  byId("search-words").textContent = `(${result.words})`;
  byId("search-plain").textContent = `(${result.plain})`;
  const cell = (hit: boolean): HTMLElement => h("td", { class: hit ? "hit" : "miss" }, hit ? "✓ found" : "–");
  byId("search-list").replaceChildren(...result.rows.map((row) => h("tr", {}, h("td", {}, row.text), cell(row.words), cell(row.plain))));
}
searchQuery.addEventListener("input", showSearch);
examples(
  byId("search-chips"),
  [
    ["strasse", "strasse"],
    ["final", "final"],
    ["full width", "full width"],
    ["ΟΔΥΣ", "ΟΔΥΣ"],
    ["art party", "art party"],
    ["cafe", "cafe"],
  ],
  (value) => setField(searchQuery, value),
);
showSearch();

// 6. Secrets

const secToken = byId<HTMLInputElement>("sec-token");
const secUser = byId<HTMLInputElement>("sec-user");
const secPassword = byId<HTMLInputElement>("sec-password");
const secLog = byId<HTMLTextAreaElement>("sec-log");
const secrets = (): { token: string; user: string; password: string } => ({ token: secToken.value, user: secUser.value, password: secPassword.value });
function showSecrets(): void {
  const result = redactLog(secLog.value, secrets());
  byId("sec-result").replaceChildren(
    h("h3", {}, h("code", {}, "redactSecrets(log, [token, { user, password }])")),
    markedText(partsOf(result.redacted, "[secret]"), "The log after redactSecrets"),
    verdict(true, "No secret:", "Each form of each secret is gone. The user name stays, because it is not a secret."),
    h("h3", {}, h("code", {}, "log.replaceAll(token, …).replaceAll(password, …)")),
    markedText(partsOf(result.replaced, LEAK), "The log after replaceAll"),
    verdict(result.leaks === 0, result.leaks === 0 ? "No secret:" : "Leaks:", result.leaks === 0 ? "The log has each secret only in its raw form." : `The log still has ${countOf(result.leaks, "form")} of the secrets, marked ${LEAK}.`),
  );
}
for (const field of [secToken, secUser, secPassword]) {
  field.addEventListener("input", () => {
    secLog.value = sampleLog(secrets());
    showSecrets();
  });
}
secLog.addEventListener("input", showSecrets);
secLog.value = sampleLog(secrets());
showSecrets();

// 7. Thrown values

/** This function makes an `Error` of another window: an `iframe` of the page. */
function errorOfAnotherWindow(): unknown {
  const frame = h("iframe", { hidden: true, title: "Another window" });
  document.body.append(frame);
  const Foreign = (frame.contentWindow as (Window & { Error: ErrorConstructor }) | null)?.Error ?? Error;
  const error = new Foreign("The disk is full.");
  frame.remove();
  return error;
}

const THROWN: Record<string, () => unknown> = { ...thrownValues(), "An Error of another window": errorOfAnotherWindow };
/** This function shows the text of one method. A method is correct when it gives the text of `errorMessage`. */
function readingRow(code: string, reading: Reading, expected: string): HTMLElement {
  if (reading.threw) return verdict(false, `${code}:`, `throws: ${reading.text}`);
  const same = reading.text === expected;
  return verdict(same, `${code}:`, h("span", {}, "gives ", h("code", {}, JSON.stringify(reading.text)), same ? "" : ", not the message"));
}
function showThrown(name: string): void {
  const reading = readThrown(THROWN[name]?.());
  byId("thrown-result").replaceChildren(
    h("p", { class: "picked" }, "The thrown value: ", h("b", {}, name)),
    readingRow("errorMessage(value)", reading.errorMessage, reading.errorMessage.text),
    readingRow("String(value)", reading.string, reading.errorMessage.text),
    readingRow("value instanceof Error ? value.message : String(value)", reading.common, reading.errorMessage.text),
  );
  for (const button of byId("thrown-chips").children) button.setAttribute("aria-pressed", String(button.textContent === name));
}
examples(
  byId("thrown-chips"),
  Object.keys(THROWN).map((name) => [name, name] as const),
  showThrown,
);
showThrown("An object with a message");

