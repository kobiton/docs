#!/bin/bash  

cd ../docker/documentation
pwd
docker build -t kobiton/documentation:1.0 -f docker/documentation/Dockerfile .

cd ../docker/portal-help
pwd
docker build -t kobiton/portal-help:1.0 -f docker/portal-help/Dockerfile .
