import { describe, expect, it } from "vitest";
import * as entry from "./index.ts";
import * as html from "./html.ts";
import * as length from "./length.ts";
import * as order from "./order.ts";
import * as parts from "./parts.ts";
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
    expect(Object.keys(redact).sort()).toEqual([
      "SECRET_SHAPES",
      "findSecretShapes",
      "findSecretShapesInValue",
      "redactSecretShapes",
      "redactSecrets",
    ]);
    expect(Object.keys(length).sort()).toEqual(["pad", "textLength", "truncate"]);
    expect(Object.keys(parts).sort()).toEqual(["partsAt", "partsOf"]);
    expect(Object.keys(order).sort()).toEqual(["compareCodePoints", "compareCodeUnits"]);
    expect(Object.keys(html).sort()).toEqual(["HTML_SKIP", "scanHtml"]);
  });
});
