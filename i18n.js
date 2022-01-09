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


function replace_text(element)
{
	if (element.innerText !== "" && element.innerText !== null)
	{
		element.innerText = browser.i18n.getMessage(element.innerText);
	}
	replace_title(element);
}


function replace_html(element)
{
	if (element.innerText !== "" && element.innerText !== null)
	{
		element.innerHTML = browser.i18n.getMessage(element.innerText);
	}
	replace_title(element);
}


function apply_i18n(element)
{
	let nodes = element.getElementsByClassName("i18n-text");
	for (let i = 0; i < nodes.length; i++)
	{
		replace_text(nodes[i]);
	}

	nodes = element.getElementsByClassName("i18n-html");
	for (let i = 0; i < nodes.length; i++)
	{
		replace_html(nodes[i]);
	}
}


apply_i18n(document);
