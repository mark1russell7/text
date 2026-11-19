import { describe, expect, it } from "vitest";
import * as entry from "./index.ts";
import * as english from "./english.ts";
import * as html from "./html.ts";
import * as length from "./length.ts";
import * as order from "./order.ts";
import * as parts from "./parts.ts";
import * as redact from "./redact.ts";
import * as references from "./references.ts";
import * as search from "./search.ts";
import * as shell from "./shell.ts";

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
      "CONTEXT_SHAPES",
      "SECRET_SHAPES",
      "findSecretShapes",
      "findSecretShapesInValue",
      "isSecretName",
      "redactSecretShapes",
      "redactSecrets",
    ]);
    expect(Object.keys(length).sort()).toEqual(["pad", "textLength", "truncate"]);
    expect(Object.keys(parts).sort()).toEqual(["partsAt", "partsOf"]);
    expect(Object.keys(order).sort()).toEqual(["compareCodePoints", "compareCodeUnits"]);
    expect(Object.keys(html).sort()).toEqual(["HTML_SKIP", "scanHtml"]);
    expect(Object.keys(references).sort()).toEqual(["decodeReferences"]);
    expect(Object.keys(english).sort()).toEqual(["countOf", "listOf"]);
    expect(Object.keys(shell).sort()).toEqual(["escapeShell"]);
    expect(Object.keys(search).sort()).toEqual(["cosineSimilarity", "inverseDocumentFrequency", "rankDocuments", "rankerOf", "searchKey", "searchWords", "termVector", "wordSearch"]);
  });
});
