/*
 * Referer Modifier: Modify the Referer header in HTTP requests
 * Copyright (C) 2022 Fiona Klute
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
"use strict";

function replace_title(element)
{
	if (element.hasAttribute("title") && element.title !== "")
	{
		element.title = browser.i18n.getMessage(element.title);
	}
}


/*
 * Turn each line of the input text into a paragraph. Within the
 * paragraph text enclosed in backticks becomes a <code> element.
 * Return an array of paragraphs.
 */
var code_re = /([^`]*)(?:`(.*?)`)?/g;
function lines_to_paragraphs(text)
{
	let lines = text.split("\n");
	let paragraphs = [];
	for (const l of lines)
	{
		let p = document.createElement("p");
		for (const m of l.matchAll(code_re))
		{
			if (m[1])
			{
				p.appendChild(document.createTextNode(m[1]));
			}
			if (m[2])
			{
				let code = document.createElement("code");
				code.innerText = m[2];
				p.appendChild(code);
			}
		}
		paragraphs.push(p);
	}
	return paragraphs;
}


function replace_text(element)
{
	if (element.innerText !== "" && element.innerText !== null)
	{
		let text = browser.i18n.getMessage(element.innerText);
		if (text.includes("\n"))
		{
			element.replaceChildren(...(lines_to_paragraphs(text)));
		}
		else
		{
			element.innerText = text;
		}
	}
	replace_title(element);
}


function apply_i18n(element)
{
	let nodes = element.getElementsByClassName("i18n-text");
	for (const n of nodes)
	{
		replace_text(n);
	}
}


apply_i18n(document);
