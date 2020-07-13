package main

import (
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	templates.ExecuteTemplate(w, "page.gohtml", r.Header)
}

var port = flag.Int("port", 8080, "server port to use")
var templates = template.Must(template.ParseFiles("page.gohtml"))

func main() {
	flag.Parse()
	http.HandleFunc("/", handler)
	http.HandleFunc("/favicon.ico", http.NotFound)
	http.Handle("/static/", http.StripPrefix("/static/",
		http.FileServer(http.Dir("./static"))))
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", *port), nil))
}
