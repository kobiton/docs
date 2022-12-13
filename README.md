# Documentation
Kobiton Help Documentation

# 1. Setup development
- `node` exact version: >=16
- Install `yarn` v1.22.4 or newer

# 2. Run in local (command line)
- Run `yarn install`
- Run `yarn global add http-server` to install http-server to local machine
- Run `antora antora-playbook.yml` then run `http-server build/documentation -c-1 -p 50`.
  Open web browser with http://localhost:50
- Run `antora antora-playbook-portal-help.yml` then run `http-server build/portal-help -c-1 -p 70` 
  Open web browser with http://localhost:70

# 3. Run antora in a container
- Run `docker run -v $PWD:/antora --rm -t antora/antora --stacktrace antora-playbook.yml`
- See more: https://docs.antora.org/antora/latest/antora-container/#docker-image-for-antora 

