FROM nginx:1.12.2-alpine

RUN mkdir -p /portal-help
WORKDIR /portal-help

COPY docker/portal-help/nginx.conf /etc/nginx
COPY docker/mime.types /etc/nginx

COPY build/portal-help .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
