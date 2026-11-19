import { defineConfig } from "tsdown";

// The build of the package for npm: an ES module for each entry and its declarations in build/. The workspace uses the source.
export default defineConfig({
  entry: ["src/index.ts", "src/redact.ts", "src/length.ts", "src/parts.ts", "src/order.ts", "src/html.ts", "src/references.ts", "src/english.ts", "src/search.ts", "src/shell.ts"],
  outDir: "build",
  format: "esm",
  platform: "neutral",
  sourcemap: true,
  publint: true,
});
