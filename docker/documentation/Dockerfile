FROM nginx:1.12.2-alpine

RUN mkdir -p /documentation
WORKDIR /documentation

COPY docker/documentation/nginx.conf /etc/nginx
COPY docker/documentation/mime.types /etc/nginx

COPY build/documentation .

EXPOSE 60

CMD ["nginx", "-g", "daemon off;"]


