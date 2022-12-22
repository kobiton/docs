FROM nginx:1.12.2-alpine as documentation

RUN mkdir -p /documentation
WORKDIR /documentation

COPY docker/documentation/nginx.conf /etc/nginx
COPY docker/mime.types /etc/nginx

COPY build/documentation .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
