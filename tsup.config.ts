import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  clean: true,
  format: ["esm", "cjs"],
  sourcemap: true,
  target: "es2020",
  treeshake: true,
  minify: false
});
