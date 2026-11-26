import { describe, expect, it } from "vitest";
import { strings } from "../test/strings.ts";
import { plainText } from "./plain-text.ts";

describe("plainText", () => {
  it("gives the text of HTML with decoded references and single spaces", () => {
    expect(plainText("<p>Fix &amp; deploy</p>\n\n<ul><li> one </li></ul>")).toBe("Fix & deploy one");
    expect(plainText("Nov <var>3</var>,&nbsp;10:00 &#80;ST")).toBe("Nov 3 , 10:00 PST");
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
