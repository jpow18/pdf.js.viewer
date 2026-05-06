import globals from "globals";
import pluginJs from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { globalIgnores } from "eslint/config";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // ignore Rollup output
  globalIgnores(["dist/**"]),

  // base JS recommended rules
  pluginJs.configs.recommended,

  // Prettier rules
  eslintPluginPrettierRecommended,

  // project-specific rules
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
