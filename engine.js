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

class RefererModEngine {
	constructor(config) {
		if (!config) {
			config = {
				/* Default empty domain configuration */
				domains: [],
				/* Default configuration for same domain requests */
				sameConf: { action: "keep", referer: "" },
				/* Default configuration for any other requests */
				anyConf: { action: "prune", referer: "" }
			};
		}
		this.setConfig(config);
	}

	setConfig(config) {
		/*
		* Configuration for specific domains
		*
		* Elements are expected to have this structure in the stored
		* configuration:
		*
		* { domain: "www.example.com", action: "keep", referer: "" }
		*
		* While loading the configuration, a "regexp" field will be added that
		* contains the regular expression compiled form the "domain" field to
		* include subdomains.
		*/
		this._domains = RefererModEngine.createDomainRegex(config.domains);
		/* Configuration for same domain requests */
		this._sameConf = config.sameConf;
		/* Configuration for any other requests */
		this._anyConf = config.anyConf;
	}

	/*
	 * Look up the action to take on any referer based on target URL (url)
	 * and URL of the request origin (originURL).
	 */
	findHostConf(url, originUrl) {
		let target = new URL(url);
		/* Check if we have a specific configuration for the target
		* domain, if yes return it. The reduce step chooses the longest
		* (most precise) match in case we have multiple filter
		* matches. */
		let match = this._domains
			.filter(d => d.regexp.test(target.hostname))
			.reduce((acc, current) => {
				if (acc == null) {
					return current;
				} else if (acc.domain.length >= current.domain.length) {
					return acc;
				} else {
					return current;
				}
			}, null);
		if (match != null) {
			return match;
		}

		if (originUrl === "" || originUrl === null || originUrl === undefined) {
			return this._anyConf;
		}

		let source = new URL(originUrl);
		if (target.hostname === source.hostname) {
			/* same domain */
			return this._sameConf;
		} else {
			/* default */
			return this._anyConf;
		}
	}

	/*
	* Compute referrer for a given pair of URL and its origin.
	*/
	computeReferrer(url, originUrl) {
		const conf = this.findHostConf(url, originUrl);
		var referrer = null;
		switch (conf.action) {
			case "prune":
				referrer = new URL(originUrl).origin + "/";
				break;
			case "target":
				referrer = new URL(url).origin + "/";
				break;
			case "replace":
				referrer = conf.referer;
				break;
			case "remove":
				referrer = "";
				break;
			default:
				/* "keep" */
				referrer = originUrl;
		}
		return referrer;
	}

	/*
	* Escape function from
	* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
	*/
	static escapeRegExp(string) {
		return string.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&');
		// $& means the whole matched string
	}

	/*
	* Create regular expressions from domains to also match subdomains.
	*/
	static createDomainRegex(domains) {
		for (let domain of domains) {
			let pattern = "(\\.|^)" + RefererModEngine.escapeRegExp(domain.domain) + "$";
			//console.log("domain '" + domain.domain + "', pattern: " + pattern);
			domain.regexp = new RegExp(pattern);
		}
		return domains;
	}
}
