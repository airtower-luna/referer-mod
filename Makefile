MANIFEST=manifest.json
CODE=*.js *.html
LOCALES=_locales/de/messages.json _locales/en/messages.json
VERSION:=$(shell grep --only-matching -P '(?<="version":\s")([\d\.]+)(?=",?$$)' $(MANIFEST))

dist:
	zip -r -FS referer-mod-$(VERSION).zip $(MANIFEST) $(CODE) $(LOCALES) LICENSE
