import { describe, expect, it } from "vitest";
import * as entry from "./index.ts";
import * as length from "./length.ts";
import * as redact from "./redact.ts";

describe("the entries", () => {
  it("export the names of the API report", () => {
    expect(Object.keys(entry).sort()).toEqual([
      "countOf",
      "errorMessage",
      "escapeAttribute",
      "escapeHtml",
      "escapeMarkdown",
      "escapeRegExp",
      "escapeWorkflowData",
      "escapeWorkflowProperty",
      "searchKey",
      "wordSearch",
    ]);
    expect(Object.keys(redact)).toEqual(["redactSecrets"]);
    expect(Object.keys(length).sort()).toEqual(["pad", "textLength", "truncate"]);
  });
});
