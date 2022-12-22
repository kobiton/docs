#!/bin/bash  
yarn install
yarn build
 
docker build -t kobiton/documentation:1.0 -f docker/documentation/Dockerfile .

docker build -t kobiton/portal-help:1.0 -f docker/portal-help/Dockerfile .
