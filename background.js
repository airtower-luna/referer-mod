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
/* from engine.js: */
/* global RefererModEngine */

/* An instance of Engine */
var engine = new RefererModEngine();
/* Reference to our registered dynamic content script */
var registeredContentScript = null;

/* Modifications enabled, lets user toggle the effects */
var mod_enabled = true;

var config = {
	/* Default empty domain configuration */
	domains: [],
	/* Default configuration for same domain requests */
	sameConf: { action: "keep", referer: "" },
	/* Default configuration for any other requests */
	anyConf: { action: "prune", referer: "" }
};

/*
 * Return a header entry as required for webRequest.HttpHeaders. The
 * name is always "Referer", the value the given string.
 */
function genRefererHeader(value)
{
	return {name: "Referer", value: value};
}

function modifyReferer(e)
{
	if (!mod_enabled)
	{
		return {requestHeaders: e.requestHeaders};
	}

	const conf = engine.findHostConf(e.url, e.originUrl);

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
	else if (conf.action === "replace")
	{
		e.requestHeaders.push(genRefererHeader(conf.referer));
	}
	return {requestHeaders: e.requestHeaders};
}



/*
 * Listener function for storage changes: Forward any changes to the
 * global variables.
 */
async function refreshConfig(change, area)
{
	let changed = false;
	if (area === "sync")
	{
		if (Object.prototype.hasOwnProperty.call(change, "domains"))
		{
			config.domains = change.domains.newValue;
			changed = true;
		}
		if (Object.prototype.hasOwnProperty.call(change, "any"))
		{
			config.anyConf = change.any.newValue;
			changed = true;
		}
		if (Object.prototype.hasOwnProperty.call(change, "same"))
		{
			config.sameConf = change.same.newValue;
			changed = true;
		}
	}

	if (changed)
	{
		engine.setConfig(config);
		await registerContentScript(config);
	}
}


/*
 * Register (or re-register) our dynamic content script.
 */
async function registerContentScript(config)
{
	let code = `
		var engineConfig = JSON.parse(
			String.raw\`${JSON.stringify(config)}\`);
		if (typeof engineInstance === 'object') {
			engineInstance.setConfig(engineConfig);
		}
	`;

	let oldRegisteredContentScript = registeredContentScript;
	registeredContentScript = null;

	// [NUANCE]
	//  It is undefined whether static content scripts will run before
	//  or after dymanic content scripts.
	let newRegisteredContentScript = await browser.contentScripts.register({
		"matches": ["https://*/*", "http://*/*"],
		"matchAboutBlank": true,
		"allFrames": true,
		"js": [{
			"code": code
		}],
		"runAt": "document_start"
	});

	if (oldRegisteredContentScript)
	{
		oldRegisteredContentScript.unregister();
	}

	if (registeredContentScript)
	{
		registeredContentScript.unregister();
	}

	registeredContentScript = newRegisteredContentScript;
}


/* Handles messaging from the popup */
function popup_connected(port)
{
	port.onMessage.addListener(
		async function(m)
		{
			if (m.mod_enabled === null)
			{
				port.postMessage({mod_enabled: mod_enabled});
			}
			else
			{
				mod_enabled = m.mod_enabled;
				console.log(`referer-mod enabled: ${mod_enabled}`);
				if (mod_enabled)
				{
					await registerContentScript(config);
					browser.browserAction.setBadgeText({text: null});
				}
				else
				{
					registeredContentScript.unregister();
					registeredContentScript = null;
					browser.browserAction.setBadgeText({text: "X"});
				}
			}
		});
}


browser.storage.sync.get(["domain"]).then(
	(result) =>
	{
		if (result.domain !== undefined)
		{
			browser.storage.sync.remove(["domain"])
				.then(console.log("deleted broken legacy domain config"));
		}
	});
/* Load configuration, or initialize with defaults */
browser.storage.sync.get(["domains", "same", "any"]).then(
	async (result) =>
	{
		if (result.domains === undefined || result.domains === null
			|| result.same === undefined || result.same === null
			|| result.any === undefined || result.any === null)
		{
			console.log(browser.i18n.getMessage("extensionName") +
						": initialized default configuration");
			browser.storage.sync.set({
				domains: config.domains,
				any: config.anyConf,
				same: config.sameConf
			});
		}
		else
		{
			config.domains = result.domains;
			config.anyConf = result.any;
			config.sameConf = result.same;

			engine.setConfig(config);
			await registerContentScript(config);
		}
	},
	(err) => console.log(browser.i18n.getMessage("extensionName") +
						 " could not load configuration: " + err));
/* Listen for configuration changes */
browser.storage.onChanged.addListener(refreshConfig);
/* Listen for HTTP requests to modify */
browser.webRequest.onBeforeSendHeaders.addListener(
	(e) => new Promise((resolve) =>
	{
		resolve(modifyReferer(e));
	}),
	{urls: ["<all_urls>"]},
	["blocking", "requestHeaders"]);

/* Internal messaging for toggle */
browser.runtime.onConnect.addListener(popup_connected);
