FROM docker.io/library/golang:1.18.3 AS builder
WORKDIR /go/src/github.com/airtower-luna/referer-mod/testserver/
COPY go.mod server.go ./
RUN CGO_ENABLED=0 go build

FROM scratch
COPY --from=builder \
     /go/src/github.com/airtower-luna/referer-mod/testserver/testserver /
COPY page.gohtml /
COPY static/ /static/
ENTRYPOINT ["/testserver"]
