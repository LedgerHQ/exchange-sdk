import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { babel } from "@rollup/plugin-babel";
import { DEFAULT_EXTENSIONS } from "@babel/core";

export default {
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "cjs",
  },
  plugins: [
    resolve({
      browser: true
    }),
    commonjs(),
    typescript(),
    babel({
      babelHelpers: "bundled",
      exclude: "node_modules/**",
      extensions: [...DEFAULT_EXTENSIONS, ".ts", "tsx"],
    }),
  ],
};
