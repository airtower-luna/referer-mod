# Test environment for Referer Modifier

The `testserver` is a Go module that provides a small test web
server. It serves an overview of HTTP headers (including `Referer`) as
well as a script that adds the Javascript `document.referrer` to the
page.

## Building and running the server

Simply build the Go module and run the binary:

```sh
go build
./testserver
```

This will start the server on port 8080, use the `-port` option to
change the port. You can add links to other servers of the same kind
by giving their base URLs as a comma separated list with the `-links`
option, e.g.:

```sh
./testserver -links http://example.com:8080,http://example.net`
```

Note that the testserver expects to find the `page.gohtml` template
and `static/` directory in its working directory.

## Docker based test environment

To test handling of `Referer` headers with different rules one needs a
bunch of servers with links between them. The dockerfiles and
[`docker-compose.yaml`](./docker-compose.yaml) in this directory serve
to set up such an environment.

There are two dockerfiles involved:

* [`Dockerfile`](./Dockerfile) sets up a container for the
  `testserver` binary with the required support files.
* [`Dockerfile.proxy`](./Dockerfile.proxy) is based on
  [`httpd:alpine`](https://hub.docker.com/_/httpd) and sets up an HTTP
  proxy that allows access to the `.test` domain.

The compose file combines them into a test environment: Two testserver
containers that serve various subdomains of `.test` (one would work
just as well, but it's more fun with two), and the HTTP proxy to
access them without messing with your local DNS: Just tell your test
browser to use the proxy, optionally use an add-on that can configure
the proxy only for the `.test` domain
(e.g. [FoxyProxy](https://addons.mozilla.org/firefox/addon/foxyproxy-standard/)).

Start the test environment (after building the Go module):

```sh
docker-compose build
docker-compose up -d
```

The proxy port is exposed at `127.0.0.1:8080`. If you need a different
port adjust the compose file as necessary. After configuring the proxy
point your browser at [http://www.x.test/](http://www.x.test/). You
can click around the different test domains and see how the `Referer`
behaves.

When done, you can stop the test environment with:

```sh
docker-compose down
```
