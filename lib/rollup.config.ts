import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "cjs",
  },
  plugins: [
    commonjs(),
    typescript({
      exclude: "**/*.test.ts",
    }),
    json(),
  ],
};
