import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs}"],
        plugins: {
            js,
            "@stylistic": stylistic
        },
        extends: ["js/recommended"],
        languageOptions: {
            globals: globals.browser
        },
        rules: {
            "curly": ["error", "multi-line"],
            "no-unreachable": ["error"],
            "@stylistic/array-bracket-spacing": ["error", "never"],
            "@stylistic/arrow-spacing": ["error", {
                "before": true,
                "after": true
            }],
            "@stylistic/block-spacing": ["error", "always"],
            "@stylistic/brace-style": ["error", "1tbs"],
            "@stylistic/comma-dangle": ["error", "never"],
            "@stylistic/comma-spacing": ["error", {
                "before": false,
                "after": true
            }],
            "@stylistic/comma-style": ["error", "last"],
            "@stylistic/indent": ["error", 4],
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/space-before-blocks": ["error", "always"],
            "@stylistic/space-before-function-paren": ["error", "never"],
            "@stylistic/space-in-parens": ["error", "never"]
        }
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            sourceType: "commonjs"
        }
    },
    {
        files: ["server/control/**/*.js"],
        languageOptions: {
            globals: globals.node
        }
    }
]);