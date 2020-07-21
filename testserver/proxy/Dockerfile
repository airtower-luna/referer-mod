FROM httpd:alpine
RUN sed -i\
    -e 's/^#\(LoadModule .*mod_proxy.so\)/\1/' \
    -e 's/^#\(LoadModule .*mod_proxy_connect.so\)/\1/' \
    -e 's/^#\(LoadModule .*mod_proxy_http.so\)/\1/' \
    /usr/local/apache2/conf/httpd.conf && \
    echo "Include conf/extra/proxy-http.conf" \
    >> /usr/local/apache2/conf/httpd.conf
COPY proxy-http.conf /usr/local/apache2/conf/extra/
