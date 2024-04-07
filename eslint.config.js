const js = require("eslint/js");
const globals = require("globals");

module.exports = [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "commonjs",
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
			// git diff output should fit in an 80 wide terminal
			"max-len": ["warn", {
				code: 78
			    tabWidth: 4
			    ignoreTemplateLiterals: true
			    ignoreUrls: true
			}],
			"no-trailing-spaces": ["error"]
		}
	}
];
