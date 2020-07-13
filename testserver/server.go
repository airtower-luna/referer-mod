package main

import (
	"html/template"
	"log"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	templates.ExecuteTemplate(w, "page.gohtml", r.Header)
}

var templates = template.Must(template.ParseFiles("page.gohtml"))

func main() {
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
