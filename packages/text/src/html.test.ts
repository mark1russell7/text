import { random } from "@mark1russell7/rigor-generators";
import { describe, expect, it } from "vitest";
import { strings } from "../test/strings.ts";
import { escapeAttribute, escapeHtml } from "./escape.ts";
import { NAMED_REFERENCES } from "./html-references.ts";
import { HTML_SKIP, scanHtml, type HtmlScan } from "./html.ts";
import { decodeReferences, plainText } from "./references.ts";

/** This function gives the words of the text of a scan, with one space between them. */
const words = (scan: HtmlScan): string => scan.text.replace(/\s+/g, " ").trim();

/** This function gives the names of the elements of a scan. */
const names = (scan: HtmlScan): string[] => scan.elements.map((element) => element.name);

const doc = (body: string, head = "<title>A title</title>") => `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`;

describe("scanHtml", () => {
  it("gives the text and the start tags of a static page", () => {
    const scan = scanHtml(doc('<h1 class="title">Hi</h1><p>Some text.</p>'));
    expect(words(scan)).toBe("A title Hi Some text.");
    expect(names(scan)).toEqual(["html", "head", "title", "body", "h1", "p"]);
    expect(scan.elements[0]).toEqual({ name: "html", attributes: { lang: "en" }, start: "<!doctype html>".length });
  });

  it("skips scripts, styles, templates and comments by default, and lists the start tag of a skipped element", () => {
    const body = [
      '<script src="app.js">document.body.textContent = "<p>a text of the script</p>"</script>',
      "<style>body { color: red }</style>",
      "<template><h1>A template</h1></template>",
      "<!-- <h1>A comment</h1> -->",
      '<div id="root"></div>',
    ].join("\n");
    const scan = scanHtml(body);
    expect(words(scan)).toBe("");
    expect(scan.elements).toEqual([
      { name: "script", attributes: { src: "app.js" }, start: 0 },
      { name: "style", attributes: {}, start: body.indexOf("<style>") },
      { name: "template", attributes: {}, start: body.indexOf("<template>") },
      { name: "div", attributes: { id: "root" }, start: body.indexOf("<div") },
    ]);
    expect(HTML_SKIP).toEqual(["script", "style", "template"]);
  });

  it("skips the elements of the option, in any case of letters", () => {
    const html = doc("<noscript><h1>Turn on JavaScript</h1></noscript><h1>T</h1><p>Text</p>");
    const scan = scanHtml(html, { skip: ["HEAD", "script", "style", "template", "noscript"] });
    expect(words(scan)).toBe("T Text");
    expect(names(scan)).toEqual(["html", "head", "body", "noscript", "h1", "p"]);
    expect(words(scanHtml("<script>a</script>b", { skip: [] }))).toBe("a b");
  });

  it("reads the attributes in each form of HTML", () => {
    const [link] = scanHtml(`<LINK REL="icon" href='/favicon.svg' type=image/svg+xml sizes = any hidden data-a="1" data-a="2">`).elements;
    expect(link).toEqual({
      name: "link",
      attributes: { rel: "icon", href: "/favicon.svg", type: "image/svg+xml", sizes: "any", hidden: "", "data-a": "1" },
      start: 0,
    });
    expect(scanHtml('<a title="1 > 0 and <b>" href=/x/>t</a>').elements).toEqual([{ name: "a", attributes: { title: "1 > 0 and <b>", href: "/x/" }, start: 0 }]);
    expect(scanHtml('<p a=&amp; =b c="" d=>t</p>').elements[0]?.attributes).toEqual({ a: "&amp;", "=b": "", c: "", d: "" });
  });

  it("keeps an attribute with the name of a property of an object as an own value", () => {
    const [element] = scanHtml('<p __proto__="x" constructor="y">').elements;
    expect(Object.getPrototypeOf(element?.attributes)).toBe(Object.prototype);
    expect(Object.hasOwn(element?.attributes ?? {}, "__proto__")).toBe(true);
    expect(element?.attributes["constructor"]).toBe("y");
  });

  it("reads the content of a title or a text area as text with no tags, and finds no tag in a script", () => {
    const scan = scanHtml('<title>a <b> c</title><textarea><p>d</p></textarea><script>const s = "<p>x</p>";</script><h1>After</h1>');
    expect(names(scan)).toEqual(["title", "textarea", "script", "h1"]);
    expect(words(scan)).toBe("a <b> c <p>d</p> After");
  });

  it("finds an end tag after white space or a slash, and keeps the text of a skipped element with no end tag", () => {
    expect(words(scanHtml("<SCRIPT>x</script ><h1>T</h1>"))).toBe("T");
    expect(words(scanHtml("<script>x</script/><h1>T</h1>"))).toBe("T");
    expect(words(scanHtml("<h1>T</h1><script>a</scripts>b"))).toBe("T a b");
    expect(words(scanHtml("<p>a</p><!-- b"))).toBe("a <!-- b");
  });

  it("reads the short comments of HTML", () => {
    expect(words(scanHtml("a<!-->b<!--->c<!---->d"))).toBe("a b c d");
  });

  it("keeps a \"<\" that does not start a tag as text, and ends at a tag with no end", () => {
    expect(words(scanHtml("<p>1 < 2 and 3 > 2</p>"))).toBe("1 < 2 and 3 > 2");
    expect(words(scanHtml("<p>x<3, a <= b, <- go, <é</p>"))).toBe("x<3, a <= b, <- go, <é");
    expect(words(scanHtml('<?xml version="1.0"?><!doctype html></p></>'))).toBe("");
    expect(scanHtml('a <p class="x')).toEqual({ text: 'a <p class="x', elements: [] });
    expect(scanHtml("a <p")).toEqual({ text: "a <p", elements: [] });
  });

  it("reads a custom element with the name of a skipped element and a dash as an element with text", () => {
    const scan = scanHtml("<template-card><h1>Card</h1></template-card><style-guide>Guide</style-guide><script-box>Box</script-box>");
    expect(words(scan)).toBe("Card Guide Box");
    expect(names(scan)).toEqual(["template-card", "h1", "style-guide", "script-box"]);
  });

  it("is linear: many starts of a comment, a script or a tag with no end do not stop the scan", () => {
    const n = 100_000;
    expect(scanHtml("<!--".repeat(n)).text).toBe("<!--".repeat(n));
    expect(names(scanHtml(`${"<script>".repeat(n)}<h1>T</h1>`))).toHaveLength(n + 1);
    // Each script has only a wrong end tag, so the scan looks for its end tag once.
    expect(words(scanHtml("<script>x</scriptx>".repeat(n)))).toBe(Array.from({ length: n }, () => "x").join(" "));
    expect(scanHtml(`a${"<".repeat(n)}`).text).toBe(`a${"<".repeat(n)}`);
    expect(scanHtml(`<p>a</p>${'<a title="'.repeat(n)}`).elements).toHaveLength(1);
  });

  it("gives a start at a \"<\" in order, and the text itself for a text with no tag, on 2000 seeded strings", () => {
    for (const text of strings("text/scan-html", 2000)) {
      const scan = scanHtml(text);
      const starts = scan.elements.map((element) => element.start);
      expect(starts.every((start) => text.charAt(start) === "<")).toBe(true);
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
      if (!/<[a-z/!?]/i.test(text)) expect(scan).toEqual({ text, elements: [] });
    }
  });
});

/** The names of the table: each name with no ";", its value, and true for a legacy name that is correct with no ";". */
const TABLE: ReadonlyArray<{ name: string; value: string; legacy: boolean }> = (() => {
  const rows: Array<{ name: string; value: string; legacy: boolean }> = [];
  let point = 0;
  for (const group of NAMED_REFERENCES.split(/[,\n]/)) {
    const [head = "", names = ""] = group.split("=");
    const [first = "", second] = head.split("+");
    point += parseInt(first, 36);
    const value = String.fromCodePoint(point, ...(second === undefined ? [] : [parseInt(second, 36)]));
    for (const entry of names.split(" ")) rows.push({ name: entry.endsWith("*") ? entry.slice(0, -1) : entry, value, legacy: entry.endsWith("*") });
  }
  return rows;
})();

const WINDOWS_1252 = new TextDecoder("windows-1252");

/** The identifiers of the table, as the tokenizer matches them: each name with ";", and each legacy name with no ";". */
const IDENTIFIERS = TABLE.flatMap(({ name, value, legacy }) => [{ id: `${name};`, value }, ...(legacy ? [{ id: name, value }] : [])]);

/**
 * This function is a second decoder, for the tests: it tries each identifier of the table at each "&" and keeps the
 * longest match. It is slow, but it has no limit on a run of letters and no index of the names.
 */
function slowDecode(text: string): string {
  let out = "";
  let at = 0;
  while (at < text.length) {
    if (text[at] !== "&") {
      out += text[at];
      at += 1;
      continue;
    }
    const numeric = /^#(?:[xX]([0-9a-fA-F]+)|([0-9]+));?/.exec(text.slice(at + 1));
    if (numeric !== null) {
      const big = numeric[1] === undefined ? BigInt(numeric[2]!) : BigInt(`0x${numeric[1]}`);
      const point = big > 0x10ffffn ? 0x110000 : Number(big);
      out +=
        point === 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)
          ? "�"
          : point >= 0x80 && point <= 0x9f
            ? WINDOWS_1252.decode(Uint8Array.of(point))
            : String.fromCodePoint(point);
      at += 1 + numeric[0].length;
      continue;
    }
    let best: { id: string; value: string } | undefined;
    for (const candidate of IDENTIFIERS) {
      if (text.startsWith(candidate.id, at + 1) && candidate.id.length > (best?.id.length ?? 0)) best = candidate;
    }
    out += best?.value ?? "&";
    at += 1 + (best?.id.length ?? 0);
  }
  return out;
}

/** The parts of the texts for the decoder: references, parts of references and the characters around them. */
const REFERENCE_PARTS: readonly string[] = [
  "&",
  "#",
  "x",
  "X",
  ";",
  "a",
  "9",
  "f",
  " ",
  "=",
  "&amp",
  "&amp;",
  "&AMP",
  "&not",
  "&notin",
  "in;",
  "it;",
  "&nbsp",
  "&rsquo",
  "&NotEqualTilde",
  "&Counter",
  "ClockwiseContourIntegral",
  "&fjlig;",
  "&#",
  "&#x",
  "&#X",
  "&#0",
  "&#128",
  "&#x9F",
  "&#xD800",
  "&#x10FFFF",
  "&#x110000",
  "99999999999",
  "é",
  "\u{1F600}",
  "\uD800",
  "\uDC00",
];

/** This function gives `count` texts of 0 to 16 parts of `REFERENCE_PARTS`, from the seed `seed`. */
function referenceTexts(seed: string, count: number): string[] {
  const r = random(seed);
  return Array.from({ length: count }, () => Array.from({ length: r.int(0, 16) }, () => r.pick(REFERENCE_PARTS)).join(""));
}

describe("decodeReferences", () => {
  it("decodes the examples of the standard: the longest name wins, and a legacy name needs no semicolon", () => {
    expect(decodeReferences("I'm &notit; I tell you")).toBe("I'm ¬it; I tell you");
    expect(decodeReferences("I'm &notin; I tell you")).toBe("I'm ∉ I tell you");
    expect(decodeReferences("&amp;&ampx&amp &AMP;&AMP&lt3 &copy2026 &not")).toBe("&&x& &&<3 ©2026 ¬");
  });

  it("keeps a name with no semicolon that is not a legacy name, and a name with the wrong case", () => {
    expect(decodeReferences("&rsquo &hellip &Amp; &NBSP; &nbspx")).toBe("&rsquo &hellip &Amp; &NBSP;  x");
    expect(decodeReferences("&notinx;")).toBe("¬inx;");
  });

  it("decodes the references of an RSS description", () => {
    expect(decodeReferences("Customers&nbsp;can&rsquo;t sign in &ndash; we&#8217;re on it &hellip;")).toBe(
      "Customers can’t sign in – we’re on it …",
    );
  });

  it("has the 2231 names of the table, and gives each value with its semicolon", () => {
    expect(IDENTIFIERS).toHaveLength(2231);
    expect(TABLE.filter((row) => row.legacy)).toHaveLength(106);
    expect(new Set(TABLE.map((row) => row.name)).size).toBe(TABLE.length);
    for (const { name, value, legacy } of TABLE) {
      expect(decodeReferences(`&${name};`)).toBe(value);
      if (legacy) expect(decodeReferences(`&${name}`)).toBe(value);
      else expect(decodeReferences(`&${name}`)).not.toBe(value);
    }
  });

  it("gives the values of the standard for names with two code points, astral values and the longest name", () => {
    expect(decodeReferences("&AElig;&nbsp;&rsquo;&Tab;&NewLine;")).toBe("Æ ’\t\n");
    expect(decodeReferences("&NotEqualTilde;&nvlt;&bne;&fjlig;")).toBe("≂̸<⃒=⃥fj");
    expect(decodeReferences("&Afr;&zopf;")).toBe("\u{1D504}\u{1D56B}");
    expect(decodeReferences("&CounterClockwiseContourIntegral;")).toBe("∳");
  });

  it("has the legacy names of HTML 4: the values U+00A0 to U+00FF and the four characters of markup", () => {
    const values = new Set(TABLE.filter((row) => row.legacy).map((row) => row.value));
    const expected = new Set(["&", "<", ">", '"', ...Array.from({ length: 96 }, (_, index) => String.fromCodePoint(0xa0 + index))]);
    expect(values).toEqual(expected);
  });

  it("decodes decimal and hexadecimal references, also with no semicolon", () => {
    expect(decodeReferences("&#65;&#x42;&#X43;&#0068;&#x000045")).toBe("ABCDE");
    expect(decodeReferences("&#65&#66x &#x41g")).toBe("ABx Ag");
    expect(decodeReferences("&#128512;&#x1F600;&#x10FFFF;")).toBe("\u{1F600}\u{1F600}\u{10FFFF}");
  });

  it("applies the fixes of the standard to a numeric value", () => {
    expect(decodeReferences("&#0;&#x0;&#00000;")).toBe("���");
    expect(decodeReferences(`&#x110000;&#1114112;&#99999999999999999999999999999;&#x${"f".repeat(50)};`)).toBe("�".repeat(4));
    expect(decodeReferences("&#xD800;&#xDBFF;&#xDC00;&#57343;")).toBe("�".repeat(4));
    expect(decodeReferences("&#13;&#x7F;&#xFFFF;&#1;")).toBe("\r\u007F￿\u0001");
  });

  it("maps 0x80 to 0x9F through windows-1252, and keeps the five code points that windows-1252 does not have", () => {
    for (let point = 0x80; point <= 0x9f; point += 1) {
      expect(decodeReferences(`&#${point};`)).toBe(WINDOWS_1252.decode(Uint8Array.of(point)));
      expect(decodeReferences(`&#x${point.toString(16)}`)).toBe(WINDOWS_1252.decode(Uint8Array.of(point)));
    }
    expect(decodeReferences("&#x80;&#x92;&#x81;&#x8D;&#x8F;&#x90;&#x9D;")).toBe("€’\u0081\u008D\u008F\u0090\u009D");
  });

  it("keeps an ampersand with no reference after it as text", () => {
    for (const text of ["&", "&&", "& b", "&;", "&#", "&#;", "&#x", "&#x;", "&#xg;", "&#a", "&nosuchname;", "a&b", "&é", "&\u{1F600}"]) {
      expect(decodeReferences(text)).toBe(text);
    }
  });

  it("gives the result of a slow decoder that tries each name, on 3000 seeded texts", () => {
    for (const text of referenceTexts("text/decode-references", 3000)) expect(decodeReferences(text)).toBe(slowDecode(text));
  });

  it("decodes each escape of escapeHtml and escapeAttribute to the input, on 3000 seeded strings", () => {
    for (const text of [...strings("text/decode-escape", 2000), ...referenceTexts("text/decode-escape", 1000)]) {
      expect(decodeReferences(escapeHtml(text))).toBe(text);
      expect(decodeReferences(escapeAttribute(text))).toBe(text);
    }
  });

  it("gives a text with no ampersand back with no change, and a result that is not longer than the text", () => {
    for (const text of [...strings("text/decode-plain", 2000), ...referenceTexts("text/decode-plain", 1000)]) {
      const plain = text.replaceAll("&", "");
      expect(decodeReferences(plain)).toBe(plain);
      expect(decodeReferences(text).length).toBeLessThanOrEqual(text.length);
    }
  });

  it("is linear: many ampersands, long runs of letters and long runs of digits do not stop the decoder", () => {
    const n = 200_000;
    expect(decodeReferences("&".repeat(n))).toBe("&".repeat(n));
    expect(decodeReferences("&a".repeat(n))).toBe("&a".repeat(n));
    expect(decodeReferences(`&${"a".repeat(n)};`)).toBe(`&${"a".repeat(n)};`);
    expect(decodeReferences(`&${"notin".repeat(n / 5)};`)).toBe(`¬in${"notin".repeat(n / 5 - 1)};`);
    expect(decodeReferences(`&#${"9".repeat(n)};x`)).toBe("�x");
    expect(decodeReferences(`&#x${"0".repeat(n)}41`)).toBe("A");
    expect(decodeReferences("&amp;".repeat(n))).toBe("&".repeat(n));
  });
});

describe("plainText", () => {
  it("gives the text of HTML with decoded references and single spaces", () => {
    expect(plainText("<p>Fix &amp; deploy</p>\n\n<ul><li> one </li></ul>")).toBe("Fix & deploy one");
    expect(plainText("Nov <var>3</var>,&nbsp;10:00 &#80;ST")).toBe("Nov 3, 10:00 PST");
    expect(plainText("<p>Text</p><script>alert(1)</script><style>p {}</style>")).toBe("Text");
  });

  it("keeps a decoded tag as text, so a reference to a tag adds no element", () => {
    expect(plainText("&lt;b&gt;bold&lt;/b&gt;")).toBe("<b>bold</b>");
  });

  it("gives undefined for no HTML and for HTML with no text", () => {
    expect(plainText(undefined)).toBeUndefined();
    expect(plainText("")).toBeUndefined();
    expect(plainText("<p> \t\n</p><br>")).toBeUndefined();
  });

  it("gives a text with no run of white space and no space at its ends, or undefined", () => {
    for (const html of strings("text/plain-text", 2000)) {
      const text = plainText(html);
      if (text === undefined) continue;
      expect(text).not.toBe("");
      expect(text).toBe(text.trim());
      expect(/\s\s/.test(text)).toBe(false);
    }
  });
});
