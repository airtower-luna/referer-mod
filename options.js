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

/* Globals: The domain row template and its children */
var template = document.querySelector("#ref_row");
var host = template.content.querySelector(".hostname");
var action = template.content.querySelector(".action");
var ref = template.content.querySelector(".referer");



/*
 * Preselect the given option in the <select> element.
 */
function selectOption(select, option)
{
	for (let i = 0; i < select.options.length; i++)
	{
		if (option === select.options[i].value)
		{
			select.selectedIndex = i;
			select.options[i].defaultSelected = true;
		}
		else
			/* Ensure that other options are NOT selected */
			select.options[i].defaultSelected = false;
	}
}



/*
 * Listener for "change" events on <select class="action"> elements,
 * disables the matching "Referer" input field if the selected action
 * does not use it.
 */
function actionSelectListener(event)
{
	event.target.parentElement.parentElement
		.querySelector(".referer").disabled =
		(event.target.value != "replace");
}



/*
 * Create a new domain row with the given content.
 */
function createDomainRow(hostname, act, referer)
{
	host.value = hostname;
	ref.value = referer;
	selectOption(action, act);
	return document.importNode(template.content, true);
}



/*
 * Add an empty domain row and configure the delete button.
 */
function addDomainRow()
{
	let row = createDomainRow("", "replace", "");
	let b = row.querySelector(".delete_row");
	b.addEventListener("click",
					   function()
					   {
						   b.parentElement.parentElement.remove();
					   },
					   { once: true });
	let act = row.querySelector(".action");
	act.addEventListener("change", actionSelectListener);
	document.getElementById("hosts").appendChild(row);
}



/*
 * Loads the configuration from storage. This function runs when the
 * options page is loaded.
 */
function restoreOptions()
{
	browser.storage.sync.get(["same", "any"]).then(
		(result) => {
			selectOption(document.querySelector("#any_action"),
						 result.any.action);
			document.querySelector("#any_referer").value = result.any.referer;
			selectOption(document.querySelector("#same_action"),
						 result.same.action);
			document.querySelector("#same_referer").value = result.same.referer;
		}, null);

	browser.storage.sync.get({
		domains: []
	}).then((result) => {
		console.log("Refreshing domains: " + JSON.stringify(result));
		let hosts = document.getElementById("hosts");
		/* Remove currently shown domain rows, if any */
		let entries = hosts.getElementsByClassName("ref_entry");
		while (entries.item(0) != null)
		{
			entries.item(0).remove();
		}
		if (result.domains.length == 0)
		{
			/* Add one empty row that will show the placeholders */
			hosts.appendChild(createDomainRow("", "replace", ""));
		}
		else
		{
			/* Add currently configured domains */
			for (let line of result.domains)
			{
				hosts.appendChild(createDomainRow(line.domain,
												  line.action,
												  line.referer));
			}
		}

		/* Enable delete buttons for domain rows */
		for (let b of hosts.getElementsByClassName("delete_row"))
		{
			b.addEventListener("click",
							   function()
							   {
								   b.parentElement.parentElement.remove();
							   },
							   { once: true });
		}
		/* Disable "Referer" field if the selected action does not use it. */
		for (let act of hosts.getElementsByClassName("action"))
		{
			act.parentElement.parentElement
				.querySelector(".referer").disabled = (act.value != "replace");
			act.addEventListener("change", actionSelectListener);
		}
	});
}



/*
 * Write the current content of the options page to storage.
 */
function saveOptions()
{
	let entries = document.getElementsByClassName("ref_entry");
	let domains = [];
	for (let entry of entries)
	{
		let host = entry.querySelector(".hostname").value.trim();
		if (host.length > 0)
		{
			let act = entry.querySelector(".action");
			domains.push({
				domain: host,
				action: act.options[act.selectedIndex].value,
				referer: entry.querySelector(".referer").value.trim()
			});
		}
	}
	let any_action = document.querySelector("#any_action");
	let any_referer = document.querySelector("#any_referer");
	let same_action = document.querySelector("#same_action");
	let same_referer = document.querySelector("#same_referer");
	browser.storage.sync.set({
		domains: domains,
		any: {
			action: any_action.options[any_action.selectedIndex].value,
			referer: any_referer.value
		},
		same: {
			action: same_action.options[same_action.selectedIndex].value,
			referer: same_referer.value
		}
	});
}



function exportConfig()
{
	browser.storage.sync.get(["same", "any", "domains"]).then(
		(result) => {
			let exportConf = {
				any:     result.any,
				same:    result.same,
				domains: result.domains
			};
			let blob = new Blob([JSON.stringify(exportConf, null, 2)],
								{ type: "application/json" });
			let url = URL.createObjectURL(blob);
			let link = document.querySelector("#export_blob");
			link.href = url;
			link.download = "referer_mod_config.json";
			document.querySelector("#export_text").hidden = false;
		}, null);
}



function enableImport()
{
	document.getElementById("import_button").disabled = false;
	document.getElementById("import_warn").hidden = false;
}

function importConfig()
{
	let importFile = document.getElementById("import_file").files[0];
	let reader = new FileReader();
    reader.onload = function(e) { importConfigJSON(e.target.result); };
    reader.readAsText(importFile);
}

function importConfigJSON(string)
{
	/* TODO: catch errors during parse/store, check format */
	let conf = JSON.parse(string);
	console.log(conf);
	browser.storage.sync.set({
		domains: conf.domains,
		any:     conf.any,
		same:    conf.same
	}).then(function() {
		restoreOptions();
	}, null);
}



/* Load current configuration into form */
document.addEventListener("DOMContentLoaded", restoreOptions);
/* Enable save button */
document.getElementById("safe_conf").addEventListener("click", saveOptions);
/* Enable "Add domain" button */
document.getElementById("add_row").addEventListener("click", addDomainRow);
/* Enable configuration export button */
document.getElementById("export").addEventListener("click", exportConfig);
/* Enable import button when the user selects a file */
document.getElementById("import_file").addEventListener("change", enableImport);
/* Listener for configuration import */
document.getElementById("import_button").addEventListener("click", importConfig);
