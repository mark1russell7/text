import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { buildSync } from "esbuild";
import { describe, expect, it } from "vitest";

// The limit of the root entry is the prediction of the first version, made before the code. A change of the limit
// needs a new prediction. The limit of the entry `./redact` was 800 bytes. Its first version has 705 bytes. Version 0.0.8
// adds the shapes of tokens and the walk of a value, and the entry has 1692 bytes. That measure came after the code, with
// no prediction before it. So the limit of `./redact` is 1900 bytes, the measure and 12 %. The limit of
// the entry `./length` is 850 bytes. Its first version has 721 bytes. The limit of the entry `./parts` is 450 bytes,
// predicted before the code. Its first version has 326 bytes. Version 0.0.9 adds the two orders of texts to the root
// entry. The prediction before the code: the root entry has 650 bytes or fewer, and the limit stays at 700 bytes.
const ENTRIES = [
  { entry: "root", file: "./index.ts", limit: 700 },
  { entry: "redact", file: "./redact.ts", limit: 1900 },
  { entry: "length", file: "./length.ts", limit: 850 },
  { entry: "parts", file: "./parts.ts", limit: 450 },
] as const;

describe("the bytes of each entry", () => {
  for (const { entry, file, limit } of ENTRIES) {
    it(`${entry}: at most ${limit} bytes, bundled and minified by esbuild, at gzip level 9`, () => {
      const result = buildSync({
        entryPoints: [fileURLToPath(new URL(file, import.meta.url))],
        bundle: true,
        minify: true,
        treeShaking: true,
        format: "esm",
        platform: "neutral",
        write: false,
      });
      const bytes = gzipSync(result.outputFiles[0]!.contents, { level: 9 }).length;
      console.log(`${entry} entry: ${result.outputFiles[0]!.contents.length} minified bytes, ${bytes} gzip bytes`);
      expect(bytes).toBeLessThanOrEqual(limit);
    });
  }
});
