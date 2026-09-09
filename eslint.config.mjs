import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  // game/ is its own project with its own tooling, and its dist/ is minified
  // output that would otherwise dominate every report.
  { ignores: ["build/**", "node_modules/**", "game/**"] },

  js.configs.recommended,

  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      // Without these two, no-unused-vars cannot see that a component is used
      // in JSX and reports every import in the file as dead.
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // The automatic JSX runtime means React is never referenced by name.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Fires on apostrophes in ordinary English — "I'm", "I've". Escaping them
      // to &apos; would make the prose unreadable in source to satisfy a parser
      // problem that no longer exists.
      "react/no-unescaped-entities": "off",
    },
  },

  {
    files: ["**/*.test.{js,jsx}", "src/setupTests.js"],
    languageOptions: { globals: globals.vitest },
  },
];
