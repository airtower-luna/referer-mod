/*
 * Referer Modifier: Modify the Referer header in HTTP requests
 * Copyright (C) 2017-2020 Fiona Klute
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

// [CAVEAT]
//  When the dynamic content script is run is undefined.
//  engineConfig may be prefilled,
//  or engineInstance.setConfig will be called later.
var engineConfig;
var engineInstance = new RefererModEngine(engineConfig);

(function() {

	const originalGetter = Reflect.getOwnPropertyDescriptor(Document.prototype, "referrer").get;

	const documentMap = new WeakMap();

	const dummy = {
			get referrer() {
			// `this` is an XPCNativeWrapper instance

			// In case someone calls us on some random things
			if (Object.prototype.toString.call(this) !== "[object HTMLDocument]") {
				return originalGetter.call(this);
			}

			// In case someone calls us on another Document instance
			let computedReferrer = documentMap.get(this.wrappedJSObject);
			if (typeof computedReferrer !== 'undefined') {
				return computedReferrer;
			}

			// [NUANCE]
			//  If history.pushState/replaceState was used,
			//  location.href will return the adulterated url.
			//  Fortunately, this cannot change the origin,
			//  but this will be a problem if we ever
			//  make decisions based on the full URL.
			let url = this.location.href;
			let originUrl = originalGetter.call(this);
			computedReferrer = engineInstance.computeReferrer(url, originUrl);
			documentMap.set(this.wrappedJSObject, computedReferrer);

			return computedReferrer;
		}
	};

	// [NUANCE]
	//  The function name is exposed on .name and .toString() on the exported function object.
	let hook = Reflect.getOwnPropertyDescriptor(dummy, 'referrer').get;
	let exported = exportFunction(hook, document);
	Reflect.defineProperty(Document.wrappedJSObject.prototype, "referrer", {
		configurable: true,
		enumerable: true,
		get: exported
	});

})();
