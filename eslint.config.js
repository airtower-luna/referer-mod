const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "script",
			globals: {
				...globals.browser,
				...globals.webextensions
			}
		},
		rules: {
			"semi": ["error", "always"],
			"semi-spacing": "error",
			"semi-style": "error",
			"quotes": ["warn", "double"],
			"curly": ["warn", "all"],
			"brace-style": ["warn", "allman", {allowSingleLine: true}],
			"indent": ["warn", "tab", {SwitchCase: 1}],
			"no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
			"no-console": ["off"],
			"no-trailing-spaces": ["error"]
		}
	},
	{
		files: ["eslint.config.js"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "commonjs"
		},
	},
	{
		files: ["web-ext-config.mjs"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module"
		},
	}
];
