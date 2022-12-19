# FROM node:16-alpine

# RUN apk --no-cache add curl findutils jq \
#     && yarn global add --ignore-optional --silent @antora/cli@latest @antora/site-generator-default@latest \
#     && yarn global add --ignore-optional --silent $(grep -o '^isomorphic-git@[^:]*' `yarn global dir`/yarn.lock) \
#     && rm -rf $(yarn cache dir)/* \
#     && find $(yarn global dir)/node_modules/`[ -d $(yarn global dir)/node_modules/asciidoctor.js ] && echo asciidoctor.js || echo @asciidoctor/core`/dist -mindepth 1 -maxdepth 1 -not -name node -exec rm -rf {} \; \
#     && find $(yarn global dir)/node_modules/handlebars/dist -mindepth 1 -maxdepth 1 -not -name cjs -exec rm -rf {} \; \
#     && find $(yarn global dir)/node_modules/handlebars/lib -mindepth 1 -maxdepth 1 -not -name index.js -exec rm -rf {} \; \
#     && find $(yarn global dir)/node_modules/isomorphic-git -mindepth 2 -maxdepth 2 -regex '.+/dist/[^/]+' -not -name for-node -exec rm -rf {} \; \
#     && find $(yarn global dir)/node_modules/isomorphic-git -mindepth 2 -maxdepth 2 -regex '.+/http/[^/]+' -not -name node -exec rm -rf {} \; \
#     && find $(yarn global dir)/node_modules/isomorphic-git -maxdepth 1 -type f -not -name cli.js -not -regex '.+\.\(cjs\|json\|md\)' -exec rm -f {} \; \
#     && rm -rf $(yarn global dir)/node_modules/js-yaml/dist \
#     && rm -rf $(yarn global dir)/node_modules/json5/dist \
#     && rm -rf $(yarn global dir)/node_modules/moment/min \
#     && rm -rf $(yarn global dir)/node_modules/moment/src \
#     && rm -rf $(yarn global dir)/node_modules/source-map/dist \
#     && rm -rf /tmp/* \
#     && yarn install

# WORKDIR /antora

# COPY docker-entrypoint.sh .

# ENTRYPOINT ["docker-entrypoint.sh"]

# CMD ["antora"]

# Start nginx
FROM nginx:1.12.2-alpine

RUN mkdir -p /portal-help
WORKDIR /portal-help

COPY replace-env-vars.sh .

RUN apk update  \
    && apk upgrade \
    && apk add bash

COPY nginx.conf /etc/nginx
COPY mime.types /etc/nginx

COPY build/portal-help .

EXPOSE 60

CMD ["nginx", "-g", "daemon off;"]

