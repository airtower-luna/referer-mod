/*
 * Referer Modifier: Test server
 * Copyright (C) 2020 Fiona Klute
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
package main

import (
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"net/url"
	"strings"
)

func makeHandler(links []string) func (http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("%v %v %v%v\n", r.RemoteAddr, r.Method, r.Host, r.URL)
		tmpl_data := struct{
			H *http.Header
			Links []string
		}{
			H: &r.Header,
			Links: links,
		}
		templates.ExecuteTemplate(w, "page.gohtml", tmpl_data)
	}
}

var port = flag.Int("port", 8080, "server port to use")
var links = flag.String("links", "", "Other servers to link to")
var templates = template.Must(template.ParseFiles("page.gohtml"))

func main() {
	flag.Parse()

	split := strings.Split(*links, ",")
	l_urls := make([]string, 0, len(split))
	for _, s := range split {
		if len(s) == 0 {
			continue;
		}
		u, err := url.Parse(s)
		if err != nil {
			log.Fatal(err)
		}
		u.Path = ""
		l_urls = append(l_urls, u.String())
	}

	http.HandleFunc("/", makeHandler(l_urls))
	http.HandleFunc("/favicon.ico", http.NotFound)
	http.Handle("/static/", http.StripPrefix("/static/",
		http.FileServer(http.Dir("./static"))))
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", *port), nil))
}
