# referer-mod

Referer Modifier is a Web Extension for Firefox to modify the Referer header in HTTP requests. For each target domain, one of five actions can be configured:

* Keep: Do not modify the Referer
* Prune: Send only the origin part of the Referer (scheme, host, and port)
* Target: Send the origin of the target URL (scheme, host, and port) as Referer
* Remove: Send no Referer at all
* Replace: Replace the Referer with a configured value

You can configure default actions for requests originating from the same domain, and any other request not matching a domain rule. The "replace" and "target" actions will create a Referer header if necessary, the others only modify or remove existing ones. The configuration can be exported as and imported from JSON files.

## Installation

Users should install the add-on from the [addons.mozilla.org page](https://addons.mozilla.org/firefox/addon/referer-modifier/).

If you're working on the code you can load your work in progress as a temporary add-on using the Firefox `about:debugging` page.

## Developer information

The following three files implement the core functionality:

* [**background.js**](./background.js) does initialization and contains the handler function `modifyReferer(e)` to
modify headers. The handler function is called from an asynchronous [`webRequest.onBeforeSendHeaders`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeSendHeaders) event listener. `background.js` also uses event listeners to update the internal configuration if it is changed via the settings page.
* [**options.html**](./options.html) is the settings page. The `value` attributes of the `option` elements inside the `select` elements with `class="action"` must match the cases handled in the `modifyReferer(e)` function.
* [**options.js**](./options.js) handles loading and saving the settings from the settings page.

Settings are saved in the [`browser.storage.sync` storage area](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync), so if the user is using Firefox sync their settings will be synchronized automatically, otherwise the storage is local.

There is limited localization data in the [`_locales/`](./_locales/) directory. The [`Makefile`](./Makefile) serves to build a ZIP archive for upload to AMO.
