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

var settings_button = document.getElementById("settings");
var deactivate_button = document.getElementById("deactivate");

var mod_enabled = true;
var port = browser.runtime.connect({name: "popup"});


function setupPowerButton(enabled)
{
	if (enabled)
	{
		deactivate_button.innerText = browser.i18n.getMessage("deactivate");
		deactivate_button.classList.remove("off");
	}
	else
	{
		deactivate_button.innerText = browser.i18n.getMessage("reactivate");
		deactivate_button.classList.add("off");
	}
}


async function toggleModification()
{
	mod_enabled = !mod_enabled;
	setupPowerButton(mod_enabled);
	port.postMessage({mod_enabled: mod_enabled});
}


settings_button.addEventListener(
	"click",
	function()
	{
		browser.runtime.openOptionsPage();
	});

deactivate_button.addEventListener("click", toggleModification);

port.onMessage.addListener(
	async function(m)
	{
		mod_enabled = m.mod_enabled;
		setupPowerButton(mod_enabled);
	});
port.postMessage({mod_enabled: null});
