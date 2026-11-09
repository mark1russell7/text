import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("the home page", () => {
  it("names the package and gives the install command", () => {
    expect(page).toContain("<title>text</title>");
    expect(page).toContain("pnpm add @mark1russell7/text");
  });

  it("links to the pages of site-pages and to the repository", () => {
    expect(page).toContain('href="./releases/"');
    expect(page).toContain('href="./status/"');
    expect(page).toContain('href="https://github.com/mark1russell7/text"');
  });
});

describe("the demo", () => {
  it("has a box for the text and an output for each of the six escapes", () => {
    expect(page).toContain('<textarea id="input"');
    for (const id of ["out-html", "out-attribute", "out-regexp", "out-markdown", "out-workflow-data", "out-workflow-property"]) expect(page).toContain(`<output id="${id}"`);
  });
});
