# referer-mod

![referer-mod logo: cat ears peeking over an edge](icon.svg)

Referer Modifier is a Web Extension for Firefox to modify the Referer header in HTTP requests, and the Javascript `document.referrer` property to match. For each target domain, one of five actions can be configured:

* Keep: Do not modify the Referer
* Prune: Send only the origin part of the Referer (scheme, host, and port)
* Target: Send the origin of the target URL (scheme, host, and port) as Referer
* Remove: Send no Referer at all
* Replace: Replace the Referer with a configured value

Rules can optionally be limited to apply only to requests from certain origin domains.

You can configure default actions for requests originating from the same domain, and any other request not matching a domain rule. The "replace" and "target" actions will create a Referer header if necessary, the others only modify or remove existing ones. The configuration can be exported as and imported from JSON files.

## Installation

Users should install the add-on from the [addons.mozilla.org page](https://addons.mozilla.org/firefox/addon/referer-modifier/).

If you're working on the code you can load your work in progress as a temporary add-on using the Firefox `about:debugging` page.

## Settings

Useful website referer settings can be shared in this discussion: https://github.com/airtower-luna/referer-mod/discussions/43

## Developer information

The following files implement the core functionality:

* [**engine.js**](./engine.js) defines the functions used to determine
  if and how the referrer values should be modified. This code is
  shared by background and content scripts.

* [**background.js**](./background.js) does initialization and
  contains the handler function `modifyReferer(e)` to modify
  headers. The handler function is called from an asynchronous
  [`webRequest.onBeforeSendHeaders`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeSendHeaders)
  event listener. `background.js` also uses event listeners to update
  the internal configuration if it is changed via the settings page.
  A dynamic content script containing the configuration is added to
  sites, for use by `content.js`.

* [**options.html**](./options.html) is the settings page. The `value`
  attributes of the `option` elements inside the `select` elements
  with `class="action"` must match the cases handled in the
  `modifyReferer(e)` function.

* [**options.js**](./options.js) handles loading and saving the
  settings from the settings page.

* [**popup.html**](./popup.html) is the popup menu that opens when you
  click the toolbar button.

* [**popup.js**](./popup.js) handles setup of the popup menu and
  communication with the background script.

* [**content.js**](./content.js) is a content script that modifies the
  `document.referrer` property to match the HTTP Referer header.

* [**i18n.js**](./i18n.js) handles internationalization of the UI (see
  below).

Settings are saved in the [`browser.storage.sync` storage area](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync), so if the user is using Firefox sync their settings will be synchronized automatically, otherwise the storage is local.

There is limited localization data in the [`_locales/`](./_locales/) directory. The [`Makefile`](./Makefile) serves to build a ZIP archive for upload to AMO.

The repository contains a [configuration file](./.eslintrc.yaml) for
[ESLint](https://eslint.org/). ESLint runs in CI (see the ["Referer
Mod / lint" job](.github/workflows/selenium.yaml)), please pay
attention to its results when working on a pull request.

### Internationalization

All user interface elements are internationalized using the
[WebExtensions i18n
API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization).
Additional translations are welcome! All you need to do is create a
subdirectory for the locale in `_locales/`, and put whatever messages
you'd like to translate into a `messages.json` file there.

When editing any of the HTML files note that elements with the
`i18n-text` class are internationalized. Their text content (and
title, if any) is used to look up the actual messages and replaced. If
the replacement text contains linebreaks, each line becomes a
paragraph and text enclosed in backticks is turned into `<code>`
elements.

## Testing

The [`testserver/`](./testserver/) directory of this repository
contains a test environment based on Go and containers that you can
use locally. You can use it manually (see the
[README](./testserver/README.md)), or run [`test.py`](./test.py) after
starting it for automated tests. The automated tests require the
[Selenium Python
client](https://www.selenium.dev/selenium/docs/api/py/) and
[Geckodriver](https://github.com/mozilla/geckodriver).

## Known issues

The `document.referrer` modification is a workaround for [Firefox bug
#1601496](https://bugzilla.mozilla.org/show_bug.cgi?id=1601496), and
unfortunately not 100% reliable because there's no way to guarantee
that the content script that does the modification always runs before
page scripts.
