import { describe, expect, it } from "vitest";
import { strings } from "../test/strings.ts";
import { HTML_SKIP, scanHtml, type HtmlScan } from "./html.ts";

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
