# Documentation
Kobiton Help Documentation

# 1. Setup development
- `node` exact version: >=16
- Install `yarn` v1.22.4 or newer

# 4. Deployment
- Clone repository
- Run `yarn install`
- Run `antora antora-playbook-portal-help.yml && antora antora-playbook.yml`
- To build docker documentation: `docker build -t kobiton/documentation:1.0 -f docker/documentation/Dockerfile .`
- To build docker portal-help:`docker build -t kobiton/portal-help:1.0 -f docker/portal-help/Dockerfile .`
- Run `docker run --rm -p 80:80 kobiton/portal-help:1.0`
