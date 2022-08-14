MANIFEST=manifest.json
CODE=*.js *.html *.css
LOCALES=_locales/*/messages.json
VERSION:=$(shell grep --only-matching -P '(?<="version":\s")([\d\.a-z]+)(?=",?$$)' $(MANIFEST))
PYTHON=$(shell command -v python3 || command -v python)
.PHONY: check clean

dist: referer-mod-$(VERSION).zip

referer-mod-$(VERSION).zip: $(MANIFEST) $(CODE) $(LOCALES) LICENSE icon.svg
	zip -r -FS referer-mod-$(VERSION).zip $(MANIFEST) $(CODE) $(LOCALES) LICENSE icon.svg

check: dist
	$(PYTHON) test.py

clean:
	-rm referer-mod-$(VERSION).zip geckodriver.log
