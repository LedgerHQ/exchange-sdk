import { defineConfig } from "tsup";

export default defineConfig(() => ({
  entry: ["./src/index.ts", "./src/*.ts"],
  outDir: "lib",
  dts: true,
  clean: true,
  minify: true,
  target: ["es2022"],
  format: ["esm", "cjs"],
  splitting: true,
  bundle: false,
}));
