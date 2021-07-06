module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
  },
  extends: "airbnb",
  rules: {
    "consistent-return": 2,
    "comma-dangle": ["error", "never"],
    indent: [1, 4],
    "no-else-return": 1,
    semi: [1, "always"],
    "space-unary-ops": 2,
  },
  parserOptions: {
    ecmaVersion: 12,
  },
};
