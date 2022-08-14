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
	#target_len;
	#origin_len;
	#rule;

	constructor(rule, target_len, origin_len)
	{
		this.#rule = rule;
		this.#target_len = target_len;
		this.#origin_len = origin_len;
	}

	/*
	 * The rule that matched.
	 */
	get rule()
	{
		return this.#rule;
	}

	/*
	 * Determine if this match is better than another one. This match
	 * is "better" if any of the following is true:
	 *
	 * - another is null
	 * - the target_len of this match is larger than that of the other
	 * - target_len of both matches is equal and the origin_len of
     *   this match is larger than origin_len of the other
	 */
	better(another)
	{
		return (another == null
				|| this.#target_len > another.#target_len
				|| (this.#target_len == another.#target_len
					&& this.#origin_len > another.#origin_len));
	}
}


/*
 * One rule as defined in the configuration, with expressions compiled
 * for matching requests.
 */
class Rule
{
	// regular expression for the target domain
	#target;
	// regular expression for the origin domain, if any
	#origin;
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
		this.#origin = "origin" in rule ?
			Rule.#createDomainRegex(rule.origin) : null;
		this.#action = rule.action;
		this.#referer = rule.referer;
	}

	toString()
	{
		return `{target: ${this.#target}, origin: ${this.#origin}, action: ${this.#action}, referer: ${JSON.stringify(this.#referer)}}`;
	}

	/*
	 * Match source and target URL against this rule, return match
	 * object. Target must be a URL object, source must be a URL
	 * object or null.
	 */
	match(source, target)
	{
		let target_match = target.hostname.match(this.#target);
		if (target_match == null)
		{
			return null;
		}

		let origin_len = -1;
		if (this.#origin != null)
		{
			let origin = source != null ? source.hostname : "";
			let origin_match = origin.match(this.#origin);
			if (origin_match == null)
			{
				return null;
			}
			origin_len = origin_match[0].length;
		}

		return new RuleMatch(this, target_match[0].length, origin_len);
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
		let source = (
			originUrl === "" || originUrl === null || originUrl === undefined)
			? null : new URL(originUrl);

		/* Check if we have a specific rule that matches the
		 * source/target domain combination, if yes return it. The
		 * reduce step chooses the best match in case we have multiple
		 * filter matches, as determined by RuleMatch.better(). */
		let match = this.#domains
			.map(d => d.match(source, target))
			.filter(d => d != null)
			.reduce((acc, current) =>
				current.better(acc) ? current : acc, null);
		if (match != null)
		{
			return match.rule;
		}

		if (source != null && target.hostname === source.hostname)
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
				referrer = originUrl ? new URL(originUrl).origin + "/" : "";
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
