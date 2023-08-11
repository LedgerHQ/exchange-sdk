import { defineConfig } from "tsup";

export default defineConfig(() => ({
  entry: ["src/index.ts"],
  outDir: "lib",
  dts: true,
  splitting: true,
  sourcemap: true,
  minify: true,
  platform: "browser",
  clean: true,
  format: ["esm", "cjs"],
  target: ["es2022"],
}));
