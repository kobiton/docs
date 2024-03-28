FROM nginx:alpine

RUN mkdir -p /docs
WORKDIR /docs

COPY docker/docs/nginx.conf /etc/nginx
COPY docker/mime.types /etc/nginx

COPY build/docs .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
