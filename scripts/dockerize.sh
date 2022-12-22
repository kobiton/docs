#!/bin/bash  
cd ..
yarn install
yarn build


cd docker/documentation
docker build -t kobiton/documentation:1.0 -f docker/documentation/Dockerfile .

cd docker/portal-help
docker build -t kobiton/portal-help:1.0 -f docker/portal-help/Dockerfile .
