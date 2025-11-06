import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";
import pluginJest from "eslint-plugin-jest";

export default [
  { ignores: ["dist", "*.config.ts"] },
  {
    files: ["**/*.ts"],
    plugins: {
      import: importPlugin,
      "@typescript-eslint": tseslint.plugin,
    },

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: true,
      },
    },

    rules: {
      ...js.configs.recommended.rules,

      ...tseslint.configs.recommendedTypeChecked[0].rules,

      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,

      ...prettier.rules,

      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  {
    // update this to match your test files
    files: ["**/*.test.ts"],
    plugins: { jest: pluginJest },
    languageOptions: {
      globals: pluginJest.environments.globals.globals,
    },
    rules: {
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/no-identical-title": "error",
      "jest/prefer-to-have-length": "warn",
      "jest/valid-expect": "error",
    },
  },
];
