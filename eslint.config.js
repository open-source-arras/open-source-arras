import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import { defineConfig } from "eslint/config";

const IDENTIFIER_IGNORE_PATTERN = "^_+$";

export default defineConfig([{
    files: ["**/*.{js,mjs,ts}"],
    plugins: {
        js,
        "@stylistic": stylistic
    },
    extends: ["js/recommended"],
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.bunBuiltin
        }
    },
    rules: {
        "curly": "error",
        "no-implicit-coercion": "error",
        "no-unreachable": "error",
        "no-unused-vars": ["error", {
            argsIgnorePattern: IDENTIFIER_IGNORE_PATTERN,
            caughtErrorsIgnorePattern: IDENTIFIER_IGNORE_PATTERN,
            varsIgnorePattern: IDENTIFIER_IGNORE_PATTERN
        }],
        "prefer-const": "error",
        "prefer-template": "error",
        "@stylistic/array-bracket-spacing": ["error", "never"],
        "@stylistic/arrow-spacing": ["error", {
            before: true,
            after: true
        }],
        "@stylistic/arrow-parens": ["error", "always"],
        "@stylistic/block-spacing": ["error", "always"],
        "@stylistic/brace-style": ["error", "1tbs"],
        "@stylistic/comma-dangle": ["error", "never"],
        "@stylistic/comma-spacing": ["error", {
            before: false,
            after: true
        }],
        "@stylistic/comma-style": ["error", "last"],
        "@stylistic/indent": ["error", 4],
        "@stylistic/linebreak-style": ["error", "unix"],
        "@stylistic/lines-between-class-members": ["error", {
            enforce: [{
                blankLine: "never",
                prev: "method",
                next: "method"
            }]
        }],
        "@stylistic/max-statements-per-line": ["error", {
            max: 1
        }],
        "@stylistic/no-mixed-spaces-and-tabs": "error",
        "@stylistic/no-trailing-spaces": "error",
        "@stylistic/one-var-declaration-per-line": "error",
        "@stylistic/quotes": ["error", "double"],
        "@stylistic/semi": ["error", "always"],
        "@stylistic/space-before-blocks": ["error", "always"],
        "@stylistic/space-before-function-paren": ["error", {
            anonymous: "never",
            named: "never",
            asyncArrow: "always",
            catch: "always"
        }],
        "@stylistic/space-in-parens": ["error", "never"],
        "@stylistic/space-infix-ops": ["error"],
        "@stylistic/switch-colon-spacing": ["error", {
            after: true,
            before: false
        }],
        "@stylistic/template-curly-spacing": "error"
    }
}]);
