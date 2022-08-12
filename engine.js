/*
 * Referer Modifier: Modify the Referer header in HTTP requests
 * Copyright (C) 2017-2022 Fiona Klute
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
/* exported RefererModEngine */

class RuleMatch
{
	#match_len;
	#rule;

	constructor(rule, match_len)
	{
		this.#rule = rule;
		this.#match_len = match_len;
	}

	get rule()
	{
		return this.#rule;
	}

	better(another)
	{
		return another == null || this.#match_len > another.#match_len;
	}
}


class Rule
{
	// regular expression for the target domain
	#target;
	// action to take for matching requests
	#action;
	// Referer to set for "replace" rule
	#referer;

	constructor(rule)
	{
		/*
		 * A rule is expected to have this structure in the stored
		 * configuration:
		 *
		 * { domain: "www.example.com", action: "keep", referer: "" }
		 */
		this.#target = Rule.#createDomainRegex(rule.domain);
		this.#action = rule.action;
		this.#referer = rule.referer;
	}

	/*
	 * Match "target" against this rule, return match object. Target
	 * must be a URL object.
	 */
	match(target)
	{
		let m = target.hostname.match(this.#target);
		if (m == null)
		{
			return null;
		}
		return new RuleMatch(this, m[0].length);
	}

	get action()
	{
		return this.#action;
	}

	get referer()
	{
		return this.#referer;
	}

	/*
	 * Escape function from
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
	 */
	static #escapeRegExp(string)
	{
		// eslint-disable-next-line no-useless-escape
		return string.replace(/[.*+?^${}()|\[\]\\]/g, "\\$&");
		// $& means the whole matched string
	}

	/*
	 * Create regular expressions from domains to also match subdomains.
	 */
	static #createDomainRegex(domain)
	{
		let pattern;
		if (domain.endsWith("$"))
		{
			pattern = domain;
		}
		else
		{
			pattern = "(\\.|^)"
				+ Rule.#escapeRegExp(domain) + "$";
		}
		//console.log(`domain '${domain.domain}', pattern: ${pattern}`);
		return new RegExp(pattern);
	}
}


class RefererModEngine
{
	#domains;
	#sameConf;
	#anyConf;

	constructor(config)
	{
		if (!config)
		{
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

	setConfig(config)
	{
		/* Configuration for specific domains. See Rule constructor
		 * for the expected structure. */
		this.#domains = config.domains.map(d => new Rule(d));
		/* Configuration for same domain requests */
		this.#sameConf = config.sameConf;
		/* Configuration for any other requests */
		this.#anyConf = config.anyConf;
	}

	/*
	 * Look up the action to take on any referer based on target URL (url)
	 * and URL of the request origin (originURL).
	 */
	findHostConf(url, originUrl)
	{
		let target = new URL(url);
		/* Check if we have a specific configuration for the target
		* domain, if yes return it. The reduce step chooses the longest
		* (most precise) match in case we have multiple filter
		* matches. */
		let match = this.#domains
			.map(d => d.match(target))
			.filter(d => d != null)
			.reduce((acc, current) =>
			{
				if (current.better(acc))
				{
					return current;
				}
				else
				{
					return acc;
				}
			}, null);
		if (match != null)
		{
			return match.rule;
		}

		if (originUrl === "" || originUrl === null || originUrl === undefined)
		{
			return this.#anyConf;
		}

		let source = new URL(originUrl);
		if (target.hostname === source.hostname)
		{
			/* same domain */
			return this.#sameConf;
		}
		else
		{
			/* default */
			return this.#anyConf;
		}
	}

	/*
	* Compute referrer for a given pair of URL and its origin.
	*/
	computeReferrer(url, originUrl)
	{
		if (url.startsWith("about:") || url.startsWith("data:"))
		{
			return originUrl;
		}

		const conf = this.findHostConf(url, originUrl);
		var referrer = null;
		switch (conf.action)
		{
			case "prune":
				if (!originUrl)
				{
					referrer = "";
				}
				else
				{
					referrer = new URL(originUrl).origin + "/";
				}
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
}
