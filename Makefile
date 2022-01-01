MANIFEST=manifest.json
CODE=*.js *.html
LOCALES=_locales/de/messages.json _locales/en/messages.json
VERSION:=$(shell grep --only-matching -P '(?<="version":\s")([\d\.]+)(?=",?$$)' $(MANIFEST))
PYTHON=$(shell command -v python3 || command -v python)

dist: referer-mod-$(VERSION).zip

referer-mod-$(VERSION).zip: $(MANIFEST) $(CODE) $(LOCALES) LICENSE icon.svg
	zip -r -FS referer-mod-$(VERSION).zip $(MANIFEST) $(CODE) $(LOCALES) LICENSE icon.svg

check: dist
	$(PYTHON) test.py
