# Documentation
Kobiton Help Documentation

# 1. Setup development

- `node` exact version: >=16
- Install `yarn` v1.22.4 or newer

# 2. Run in local (command line)
- Run `yarn install`
- Run `antora antora-playbook.yml`
- Run `yarn global add http-server` to install http-server to local machine
- Run `http-server build/site -c-1 -p 5000` and open web browser with http://localhost:5000

# 3. Run antora in a container
- Run `docker run -v $PWD:/antora --rm -t antora/antora --stacktrace antora-playbook.yml`
- See more: https://docs.antora.org/antora/latest/antora-container/#docker-image-for-antora 

