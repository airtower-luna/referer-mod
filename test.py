#!/usr/bin/python3
# PYTHON_ARGCOMPLETE_OK

# Referer Modifier: Automatic test
# Copyright (C) 2020-2022 Fiona Klute
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
import shutil
import sys
import unittest
import uuid
from collections import namedtuple
from pathlib import Path
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.support.ui import WebDriverWait

# Contains data for testing a link: The page to load initially
# (source), the link to click there (target), and the expected Referer
# header for the second request (referer).
testlink = namedtuple('testlink', ['source', 'target', 'referer'])


class RefModTest(unittest.TestCase):
    quit_browser = True

    @classmethod
    def setUpClass(cls):
        cls.ext_dir = Path(__file__).parent
        with open(cls.ext_dir / 'manifest.json') as fh:
            manifest = json.load(fh)

        cls.addon_path = (cls.ext_dir /
                          f'referer-mod-{manifest["version"]}.zip').resolve()
        addon_id = manifest["browser_specific_settings"]["gecko"]["id"]
        addon_dyn_id = str(uuid.uuid4())
        cls.config_url = f'moz-extension://{addon_dyn_id}/options.html'
        cls.popup_url = f'moz-extension://{addon_dyn_id}/popup.html'
        print(f'Dynamic ID: {addon_dyn_id}')

        cls.options = FirefoxOptions()
        if 'FIREFOX_BIN' in os.environ:
            cls.options.binary = os.environ['FIREFOX_BIN']
        # Pre-seed the dynamic addon ID so we can find the options page
        cls.options.set_preference('extensions.webextensions.uuids',
                                   json.dumps({addon_id: addon_dyn_id}))
        # Use the local test environment, see testserver/
        cls.options.set_preference('network.proxy.type', 1)
        cls.options.set_preference('network.proxy.http', 'localhost')
        cls.options.set_preference('network.proxy.http_port', 8080)
        if not os.environ.get('DISPLAY'):
            cls.options.add_argument('-headless')

        driver_args = {'log_output': 'geckodriver.log'}
        # try to find geckodriver without selenium-manager (which is
        # not in the Debian package)
        if (g := shutil.which('geckodriver')) is not None:
            driver_args['executable_path'] = g
        service = FirefoxService(**driver_args)
        cls.browser = webdriver.Firefox(options=cls.options, service=service)
        cls.browser.install_addon(str(cls.addon_path), temporary=True)

    @classmethod
    def tearDownClass(cls):
        if cls.quit_browser:
            cls.browser.quit()

    def click_link(self, target):
        links = self.browser.find_elements(By.TAG_NAME, 'a')
        for link in links:
            if link.get_attribute('href') == target:
                # Found target link, click
                link.click()
                return
        self.fail(f'No link to {target} found!')

    def load_config(self, conffile):
        """Import referer-mod configuration from conffile (Path)"""
        self.browser.get(self.config_url)
        import_file = self.browser.find_element(By.ID, 'import_file')
        import_file.send_keys(str(conffile.resolve()))
        import_button = self.browser.find_element(By.ID, 'import_button')
        import_button.click()

    def toggle_deactivate(self):
        """Open the popup and press the (de)activate button. Returns the state
        after, True for modification enabled.

        """
        self.browser.get(self.popup_url)
        deactivate_button = self.browser.find_element(By.ID, 'deactivate')
        initial = 'off' in deactivate_button.get_attribute("class")
        deactivate_button.click()

        # wait for the change to take effect
        wait = WebDriverWait(self.browser, 10)
        # b is the driver supplied to wait, unused here because the
        # lambda function has access to the current context anyway
        wait.until(lambda b: initial
                   != ('off' in deactivate_button.get_attribute("class")))
        return 'off' not in deactivate_button.get_attribute("class")

    def check_referer(self, link, skip_iframe=False):
        self.browser.get(link.source)
        self.click_link(link.target)
        print(f'Navigating: {link.source} -> {link.target}')
        self.assert_referer(link.referer, skip_iframe)

    def assert_referer(self, expected, skip_iframe=False):
        """Assert that the currently opened test page lists the
        expected referer value."""
        try:
            http_referer = self.browser.find_element(
                By.XPATH, '//td[text()="Referer"]//following::td')
            print(f'Page shows referer: {http_referer.text}')
            self.assertEqual(expected, http_referer.text)
        except NoSuchElementException:
            print('Page shows no Referer.')
            if expected is not None:
                raise
        script_referrer = self.browser.find_element(By.ID, 'referrer')
        self.assertEqual(expected or '', script_referrer.text)
        reflect_referrer = \
            self.browser.find_element(By.ID, 'referrer-reflect')
        self.assertEqual(expected or '', reflect_referrer.text)
        # The iframe manipulation might fail on repeated
        # loads, maybe because the cache speeds up loading.
        if not skip_iframe:
            iframe_referrer = \
                self.browser.find_element(By.ID, 'referrer-iframe')
            self.assertEqual(expected or '', iframe_referrer.text)

    def testReferers(self):
        self.load_config(self.ext_dir / 'test_config.json')

        # mapping from next target to click to expected Referer, in order
        tests = [
            testlink('http://web.x.test/page/', 'http://web.x.test/page/',
                     'http://web.x.test/page/'),
            testlink('http://web.x.test/page/', 'http://www.x.test/page/',
                     'http://web.x.test/'),
            testlink('http://www.x.test/page/', 'http://site.y.test/page/',
                     'https://www.example.com/'),
            testlink('http://site.y.test/page/', 'http://www.y.test/page/',
                     None),
        ]

        for link in tests:
            with self.subTest(link=link):
                self.check_referer(link)

    def testReferersOrigin(self):
        """test rules with origin"""
        self.load_config(self.ext_dir / 'test_config_origin.json')

        tests = [
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
        ]

        for link in tests:
            with self.subTest(link=link):
                self.check_referer(link)

    def test_direct(self):
        """test Referer of page opened without link"""
        self.load_config(self.ext_dir / 'test_config.json')
        self.browser.get('http://site.y.test/page/')
        self.assert_referer('https://www.example.com/')

    def testDeactivate(self):
        self.load_config(self.ext_dir / 'test_config.json')

        # expected behavior with Referer modification active
        link_active = testlink(
            'http://www.x.test/page/', 'http://site.y.test/page/',
            'https://www.example.com/')
        # expected behavior with Referer modification deactivated
        link_deactivated = testlink(
            'http://www.x.test/page/', 'http://site.y.test/page/',
            'http://www.x.test/')

        self.check_referer(link_active)
        self.assertFalse(self.toggle_deactivate())
        self.check_referer(link_deactivated)
        self.assertTrue(self.toggle_deactivate())
        self.check_referer(link_active, skip_iframe=False)


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
    RefModTest.quit_browser = args.quit_browser

    if args.manual:
        RefModTest().setUpClass()
    else:
        unittest.main(verbosity=2, argv=sys.argv[:1] + argv)
