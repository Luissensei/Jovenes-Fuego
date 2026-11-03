module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*",
    "/generated/**/*",
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],

    // TypeScript already provides typed declarations; JSDoc is optional.
    "require-jsdoc": "off",

    // Keep long validated messages and typed callable payloads readable.
    "max-len": "off",

    // The source intentionally removes the null byte from user text.
    "no-control-regex": "off",

    // Use the project formatter's normal ternary layout.
    "operator-linebreak": "off",
  },
};
