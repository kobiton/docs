FROM nginx:1.12.2-alpine

RUN mkdir -p /widget
WORKDIR /widget

COPY docker/widget/nginx.conf /etc/nginx
COPY docker/mime.types /etc/nginx

COPY build/widget .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
