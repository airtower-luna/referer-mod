#!/usr/bin/python3
# PYTHON_ARGCOMPLETE_OK

# Referer Modifier: Automatic test
# Copyright (C) 2020-2023 Fiona Klute
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

import json
import os
import pytest
import shutil
import sys
import uuid
from collections import namedtuple
from pathlib import Path
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.support.ui import WebDriverWait

# directory containing the add-on source (and this test module)
EXT_DIR = Path(__file__).parent

# Contains data for testing a link: The page to load initially
# (source), the link to click there (target), and the expected Referer
# header for the second request (referer).
testlink = namedtuple('testlink', ['source', 'target', 'referer'])

# Selenium browser instance plus add-on installation data required for
# tests
BrowserInstance = namedtuple(
    'BrowserInstance', ['browser', 'config_url', 'popup_url'])


def _tl_id(link: testlink):
    """Helper function to format a testlink as a parametrized test ID."""
    return f'{link.source} -> {link.target}'


def set_up_instance():
    with open(EXT_DIR / 'manifest.json') as fh:
        manifest = json.load(fh)

    addon_path = (EXT_DIR /
                  f'referer-mod-{manifest["version"]}.zip').resolve()
    addon_id = manifest["browser_specific_settings"]["gecko"]["id"]
    addon_dyn_id = str(uuid.uuid4())
    print(f'Dynamic ID: {addon_dyn_id}')

    options = FirefoxOptions()
    if 'FIREFOX_BIN' in os.environ:
        options.binary = os.environ['FIREFOX_BIN']
    # Pre-seed the dynamic addon ID so we can find the options page
    options.set_preference('extensions.webextensions.uuids',
                           json.dumps({addon_id: addon_dyn_id}))
    # Use the local test environment, see testserver/
    options.set_preference('network.proxy.type', 1)
    options.set_preference('network.proxy.http', 'localhost')
    options.set_preference('network.proxy.http_port', 8080)
    if not os.environ.get('DISPLAY'):
        options.add_argument('-headless')

    driver_args = {'log_output': 'geckodriver.log'}
    # try to find geckodriver without selenium-manager (which is
    # not in the Debian package)
    if (g := shutil.which('geckodriver')) is not None:
        driver_args['executable_path'] = g
    service = FirefoxService(**driver_args)

    browser = webdriver.Firefox(options=options, service=service)
    browser.install_addon(str(addon_path), temporary=True)

    return BrowserInstance(
        browser=browser,
        config_url=f'moz-extension://{addon_dyn_id}/options.html',
        popup_url=f'moz-extension://{addon_dyn_id}/popup.html')


@pytest.fixture(scope='session')
def browser_instance():
    i = set_up_instance()
    yield i
    # The environment variable is set in __main__ code if requested, a
    # module variable doesn't stick through pytest.main().
    if os.environ.get('_REFMOD_QUIT_BROWSER') != 'False':
        i.browser.quit()


def load_browser_config(instance, conffile):
    """Import referer-mod configuration from conffile (Path)"""
    instance.browser.get(instance.config_url)
    import_file = instance.browser.find_element(By.ID, 'import_file')
    import_file.send_keys(str(conffile.resolve()))
    import_button = instance.browser.find_element(By.ID, 'import_button')
    import_button.click()


@pytest.fixture
def default_instance(browser_instance):
    load_browser_config(browser_instance, EXT_DIR / 'test_config.json')
    return browser_instance


@pytest.fixture
def origin_instance(browser_instance):
    load_browser_config(browser_instance, EXT_DIR / 'test_config_origin.json')
    return browser_instance


def assert_referer(browser, expected):
    """Assert that the currently opened test page lists the
    expected referer value."""
    try:
        http_referer = browser.find_element(
            By.XPATH, '//td[text()="Referer"]//following::td')
        print(f'Page shows referer: {http_referer.text}')
        assert expected == http_referer.text
    except NoSuchElementException:
        print('Page shows no Referer.')
        if expected is not None:
            raise
    script_referrer = browser.find_element(By.ID, 'referrer')
    assert (expected or '') == script_referrer.text
    reflect_referrer = \
        browser.find_element(By.ID, 'referrer-reflect')
    assert (expected or '') == reflect_referrer.text
    iframe_referrer = \
        browser.find_element(By.ID, 'referrer-iframe')
    assert (expected or '') == iframe_referrer.text


def click_link(browser, target):
    links = browser.find_elements(By.TAG_NAME, 'a')
    for link in links:
        if link.get_attribute('href') == target:
            # Found target link, click
            link.click()
            return
    pytest.fail(f'No link to {target} found!')


def check_referer(browser, link):
    browser.get(link.source)
    click_link(browser, link.target)
    print(f'Navigating: {link.source} -> {link.target}')
    assert_referer(browser, link.referer)


def toggle_deactivate(instance):
    """Open the popup and press the (de)activate button. Returns the state
    after, True for modification enabled.

    """
    instance.browser.get(instance.popup_url)
    deactivate_button = instance.browser.find_element(By.ID, 'deactivate')
    initial = 'off' in deactivate_button.get_attribute("class")
    deactivate_button.click()

    # wait for the change to take effect
    wait = WebDriverWait(instance.browser, 10)
    # b is the driver supplied to wait, unused here because the
    # lambda function has access to the current context anyway
    wait.until(lambda b: initial
               != ('off' in deactivate_button.get_attribute("class")))
    return 'off' not in deactivate_button.get_attribute("class")


def test_direct(default_instance):
    """test Referer of page opened without link"""
    default_instance.browser.get('http://site.y.test/page/')
    assert_referer(default_instance.browser, 'https://www.example.com/')


def test_deactivate(default_instance):
    # expected behavior with Referer modification active
    link_active = testlink(
        'http://www.x.test/page/', 'http://site.y.test/page/',
        'https://www.example.com/')
    # expected behavior with Referer modification deactivated
    link_deactivated = testlink(
        'http://www.x.test/page/', 'http://site.y.test/page/',
        'http://www.x.test/')

    check_referer(default_instance.browser, link_active)
    assert not toggle_deactivate(default_instance)
    check_referer(default_instance.browser, link_deactivated)
    assert toggle_deactivate(default_instance)
    check_referer(default_instance.browser, link_active)


@pytest.mark.parametrize("link", [
        testlink('http://web.x.test/page/', 'http://web.x.test/page/',
                 'http://web.x.test/page/'),
        testlink('http://web.x.test/page/', 'http://www.x.test/page/',
                 'http://web.x.test/'),
        testlink('http://www.x.test/page/', 'http://site.y.test/page/',
                 'https://www.example.com/'),
        testlink('http://site.y.test/page/', 'http://www.y.test/page/',
                 None),
], ids=_tl_id)
def test_referers(default_instance, link):
    check_referer(default_instance.browser, link)


@pytest.mark.parametrize('link', [
    # rule with equal target and origin overrides rule for
    # same target with empty origin
    testlink('http://www.x.test/page/', 'http://www.x.test/page/',
             'http://www.x.test/page/'),
    # longer target match is used regardless of length of
    # origin match
    testlink('http://www.x.test/page/', 'http://web.x.test/page/',
             'https://www.example.com/'),
    # Between rules with the same target and different origin
    # longer origin wins.
    testlink('http://site.y.test/page/', 'http://www.y.test/page/',
             'Meow'),
    # Negative regexp match for origin
    testlink('http://web.x.test/page/', 'http://www.y.test/page/',
             'Hello World!'),
], ids=_tl_id)
def test_referers_origin(origin_instance, link):
    """test rules with origin"""
    check_referer(origin_instance.browser, link)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(
        description='Run referer-mod tests')
    parser.add_argument(
        '--no-quit', action='store_false', dest='quit_browser',
        help='don\'t stop browser instances after tests')
    parser.add_argument(
        '--manual', action='store_true',
        help='instead of running automated tests, start a browser instance '
        'with identical setup for manual tests')

    # enable bash completion if argcomplete is available
    try:
        import argcomplete  # type: ignore
        argcomplete.autocomplete(parser)
    except ImportError:
        pass

    args, argv = parser.parse_known_args()
    if not args.quit_browser:
        os.environ['_REFMOD_QUIT_BROWSER'] = 'False'

    if args.manual:
        set_up_instance()
    else:
        sys.exit(pytest.main(args=sys.argv[:1] + argv))
