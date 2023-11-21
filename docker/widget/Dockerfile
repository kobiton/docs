FROM nginx:alpine

RUN apk update  \
    && apk upgrade \
    && apk add bash

RUN mkdir -p /widget
WORKDIR /widget

COPY scripts/replace-env-vars.sh .

COPY docker/widget/nginx.conf /etc/nginx
COPY docker/mime.types /etc/nginx

COPY build/widget .

ENV KOBITON_STANDALONE_API_V2_DOCS_URL=''
ENV KOBITON_STANDALONE_API_V2_DOCS_URL=''

EXPOSE 80

# CMD ["nginx", "-g", "daemon off;"]
CMD /bin/bash ./replace-env-vars.sh /widget && nginx -g 'daemon off;'