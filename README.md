# Documentation
Kobiton Help Documentation

# 1. Setup development
- `node` exact version: >=16
- Install `yarn` v1.22.4 or newer

# 2. Start source code on the local (command line)
- Run `yarn global add @antora/cli@latest @antora/site-generator-default@latest`
- Run `yarn global add http-server` to install http-server to local machine
- Run `yarn install`
- Run `antora antora-playbook.yml` then run `http-server build/documentation -c-1 -p 50`.
  Open web browser with http://localhost:50
- Run `antora antora-playbook-portal-help.yml` then run `http-server build/portal-help -c-1 -p 70` 
  Open web browser with http://localhost:70


# 4. Deployment
- Git clone repository
- Run `yarn global add @antora/cli@latest @antora/site-generator-default@latest`
- Run `yarn install`
- Run `antora antora-playbook-portal-help.yml && antora antora-playbook.yml`
- To build docker documentation: `docker build -t kobiton/documentation:1.0 -f docker/documentation/Dockerfile .`
- To build docker portal-help:`docker build -t kobiton/portal-help:1.0 -f docker/portal-help/Dockerfile .`
- Run `docker run --rm -p 80:80 kobiton/portal-help:1.0`
