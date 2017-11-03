MANIFEST=manifest.json
CODE=*.js *.html
LOCALES=_locales/de/messages.json _locales/en/messages.json
VERSION=0.4

dist:
	zip -r -FS referer-mod-$(VERSION).zip $(MANIFEST) $(CODE) $(LOCALES) LICENSE
