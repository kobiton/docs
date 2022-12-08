#!/bin/sh

# abort script if a command fails
set -e

# prepend antora if command is not detected
if [ $# -eq 0 ] || [ "${1:0:1}" == '-' ] || [ -z "$(command -v "$1")" ] || [ -d "$(command -v "$1")" ] || [ ! -x "$(command -v "$1")" ]; then
  set -- antora "$@"
fi

exec "$@"