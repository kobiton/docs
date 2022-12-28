#!/bin/bash
curl https://raw.github.com/creationix/nvm/master/install.sh | sh
source ~/.nvm/nvm.sh
nvm install 16
npm install --global yarn 
yarn install
yarn build
 
# These params are for CI to control the output docker image
docker_image_name1="${KOBITON_CI_DOCKER_IMAGE_NAME:-documentation}"
docker_image_tag1="${KOBITON_CI_DOCKER_IMAGE_TAG:-latest}"

docker_image_name2="${KOBITON_CI_DOCKER_IMAGE_NAME:-portal-help}"
docker_image_tag2="${KOBITON_CI_DOCKER_IMAGE_TAG:-latest}"


docker build -t documentation:$GIT_COMMIT_ID --build-arg COMMIT_ID=`git rev-parse --short HEAD` -f docker/documentation/Dockerfile .


docker build -t portal-help:$GIT_COMMIT_ID --build-arg COMMIT_ID=`git rev-parse --short HEAD` -f docker/portal-help/Dockerfile .