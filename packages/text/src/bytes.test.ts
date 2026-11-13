import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { buildSync } from "esbuild";
import { describe, expect, it } from "vitest";

// The limit of the root entry is the prediction of the first version, made before the code. A change of the limit
// needs a new prediction. The limit of the entry `./redact` is 800 bytes. Its first version has 705 bytes.
const ENTRIES = [
  { entry: "root", file: "./index.ts", limit: 700 },
  { entry: "redact", file: "./redact.ts", limit: 800 },
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
