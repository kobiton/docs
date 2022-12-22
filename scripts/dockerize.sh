#!/bin/bash
curl https://raw.github.com/creationix/nvm/master/install.sh | sh
source ~/.nvm/nvm.sh
nvm install 16
npm install --global yarn 
yarn install
yarn build
 

docker build -t kobiton/documentation:1.0 -f docker/documentation/Dockerfile .

docker build -t kobiton/portal-help:1.0 -f docker/portal-help/Dockerfile .
