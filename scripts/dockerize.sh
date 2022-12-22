#!/bin/bash   
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
nvm install node 
yarn install
yarn build
 

docker build -t kobiton/documentation:1.0 -f docker/documentation/Dockerfile .

docker build -t kobiton/portal-help:1.0 -f docker/portal-help/Dockerfile .
