/*
 * Referer Modifier: Modify the Referer header in HTTP requests
 * Copyright (C) 2020 Fiona Klute
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

function setReferrer(response)
{
	Reflect.defineProperty(document.wrappedJSObject,
						   'referrer', {
							   get: exportFunction(function() {
								   return response.referrer;
							   }, document)
						   });
}

function handleError(error) {
	console.log(`Could not determine document.referrer override: ${error}`);
}

let sending = browser.runtime.sendMessage({
	target: window.location.href,
	referrer: document.referrer
});
sending.then(setReferrer, handleError);
