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
