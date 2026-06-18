import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/pdf/index.ts"],
  dts: true,
  clean: true,
  format: ["esm", "cjs"],
  sourcemap: true,
  target: "es2020",
  treeshake: true,
  minify: false,
  external: ["pdfjs-dist"],
});
