/*
 * Referer Modifier: Modify the Referer header in HTTP requests
 * Copyright (C) 2017-2019 Fiona Klute
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
var domains = [];
/* Default configuration for same domain requests */
var sameConf = { action: "keep", referer: "" };
/* Default configuration for any other requests */
var anyConf = { action: "prune", referer: "" };



/*
 * Look up the action to take on any referer based on target URL (url)
 * and URL of the request origin (originURL).
 */
function findHostConf(url, originUrl)
{
	let target = new URL(url);
	/* Check if we have a specific configuration for the target
	 * domain, if yes return it. The reduce step chooses the longest
	 * (most precise) match in case we have multiple filter
	 * matches. */
	let match = domains.filter(d => d.regexp.test(target.hostname))
		.reduce((acc, current) =>
				{
					return acc == null ? current :
						(acc.domain.length >= current.domain.length ?
						 acc : current)
				}, null);
	if (match != null)
		return match;

	let source = new URL(originUrl);
	if (target.hostname === source.hostname)
	{
		/* same domain */
		return sameConf;
	}
	else
	{
		/* default */
		return anyConf;
	}
}

/*
 * Return a header entry as required for webRequest.HttpHeaders. The
 * name is always "Referer", the value the given string.
 */
function genRefererHeader(value)
{
	let header = {};
	header.name = "Referer";
	header.value = value;
	return header;
}

function modifyReferer(e)
{
	const conf = findHostConf(e.url, e.originUrl);

	for (let i = 0; i < e.requestHeaders.length; i++)
	{
		let header = e.requestHeaders[i];
		if (header.name.toLowerCase() === "referer")
		{
			switch (conf.action)
			{
				case "prune":
					header.value = new URL(header.value).origin + "/";
					break;
				case "target":
					header.value = new URL(e.url).origin + "/";
					break;
				case "replace":
					header.value = conf.referer;
					break;
				case "remove":
					e.requestHeaders.splice(i, 1);
					break;
				/* nothing to do for "keep" */
				default:
					;
			}
			return {requestHeaders: e.requestHeaders};
		}
	}

	/* If we get to this point there was no referer in the request
	 * headers. */
	if (conf.action === "target")
	{
		e.requestHeaders.push(genRefererHeader(new URL(e.url).origin + "/"));
	}
	if (conf.action === "replace")
	{
		e.requestHeaders.push(genRefererHeader(conf.referer));
	}
	return {requestHeaders: e.requestHeaders};
}



/*
 * Escape function from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
 */
function escapeRegExp(string)
{
	return string.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&');
	// $& means the whole matched string
}



/*
 * Create regular expressions from domains to also match subdomains.
 */
function createDomainRegex()
{
	for (let domain of domains)
	{
		let pattern = "(\\.|^)" + escapeRegExp(domain.domain) + "$";
		console.log("domain '" + domain.domain + "', pattern: " + pattern);
		domain.regexp = new RegExp(pattern);
	}
}



/*
 * Listener function for storage changes: Forward any changes to the
 * global variables.
 */
function refreshConfig(change, area)
{
	if (area === "sync" && change.hasOwnProperty("domains"))
	{
		domains = change.domains.newValue;
		createDomainRegex();
	}
	if (area === "sync" && change.hasOwnProperty("any"))
		anyConf = change.any.newValue;
	if (area === "sync" && change.hasOwnProperty("same"))
		sameConf = change.same.newValue;
}



browser.storage.sync.get(["domain"]).then(
	(result) => {
		if (result.domain !== undefined)
		{
			browser.storage.sync.remove(["domain"])
				.then(console.log("deleted broken legacy domain config"));
		}
	});
/* Load configuration, or initialize with defaults */
browser.storage.sync.get(["domains", "same", "any"]).then(
	(result) => {
		if (result.domains === undefined || result.domains === null
			|| result.same === undefined || result.same === null
			|| result.any === undefined || result.any === null)
		{
			console.log(browser.i18n.getMessage("extensionName") +
						": initialized default configuration");
			browser.storage.sync.set({
				domains: domains,
				any:     anyConf,
				same:    sameConf
			});
		}
		else
		{
			domains = result.domains;
			createDomainRegex();
			anyConf = result.any;
			sameConf = result.same;
		}
	},
	(err) => console.log(browser.i18n.getMessage("extensionName") +
						 " could not load configuration: " + err));
/* Listen for configuration changes */
browser.storage.onChanged.addListener(refreshConfig);
/* Listen for HTTP requests to modify */
browser.webRequest.onBeforeSendHeaders.addListener(
	(e) => new Promise((resolve, reject) => {
		resolve(modifyReferer(e));
	}),
	{urls: ["<all_urls>"]},
	["blocking", "requestHeaders"]);
