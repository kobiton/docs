FROM nginx:1.12.2-alpine

RUN mkdir -p /documentation
WORKDIR /documentation

COPY nginx.conf /etc/nginx
COPY mime.types /etc/nginx

COPY build/documentation .

EXPOSE 60

CMD ["nginx", "-g", "daemon off;"]


