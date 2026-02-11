/*
 * Referer Modifier: Modify the Referer header in HTTP requests
 * Copyright (C) 2017-2021 Fiona Klute
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
/* from engine.js and the content script environment: */
/* global RefererModEngine, exportFunction */

// [NUANCE]
//  It is undefined whether static content scripts will run before
//  or after dynamic content scripts. If the dynamic script ran first,
//  engineConfig is prefilled here, otherwise engineInstance.setConfig()
//  will be called later.
// eslint-disable-next-line no-unassigned-vars
var engineConfig;
var engineInstance = new RefererModEngine(engineConfig);

(function()
{

	const originalGetter = Reflect.getOwnPropertyDescriptor(
		Document.wrappedJSObject.prototype, "referrer").get;

	const documentMap = new WeakMap();

	const _toString = Object.prototype.toString;
	const _call = Function.prototype.call;

	const dummy = {
		get referrer()
		{
			// `this` is an XPCNativeWrapper instance

			// In case someone calls us on some random things
			if (_toString.call(this) !== "[object HTMLDocument]" ||
				_toString.call(Reflect.getPrototypeOf(this))
				!== "[object HTMLDocument]"
			)
			{
				return _call.call(originalGetter, this);
			}

			// In case someone calls us on another Document instance
			let computedReferrer = documentMap.get(this.wrappedJSObject);
			if (typeof computedReferrer !== "undefined")
			{
				return computedReferrer;
			}

			let url = this.URL;
			let originUrl = String(_call.call(originalGetter, this));
			computedReferrer = engineInstance.computeReferrer(url, originUrl);
			documentMap.set(this.wrappedJSObject, computedReferrer);

			return computedReferrer;
		}
	};

	// [NUANCE]
	// The function name is exposed on .name and .toString() on the
	// exported function object.
	let hook = Reflect.getOwnPropertyDescriptor(dummy, "referrer").get;
	let exported = exportFunction(hook, document);
	Reflect.defineProperty(Document.wrappedJSObject.prototype, "referrer", {
		configurable: true,
		enumerable: true,
		get: exported
	});

})();
