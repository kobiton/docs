#!/bin/bash
# This script replaces patterns inside Portal static files to their respective environment variable
# Usage: bash replace-env-vars.sh <path/to/portal/build/dist>

# This is a workaround to use associative array on bash version 3
# For more information: https://stackoverflow.com/a/17992349/5006288
set -x
DEFAULT_VARS=(
    'KOBITON_STANDALONE_API_V2_DOCS_URL::https://api.kobiton.com/v2/docs'
    'KOBITON_STANDALONE_DOCS_V2_URL::https://docs.kobiton.com'
)

# The .js file has many tokens which are supposed to be replaced with real values provided from
# shell env variables. This is to give the ability to provide runtime variables to the frontend app
# rather than in build-time.
# To make sure tokens are unique so that the replacement doesn't override any other text, each token
# has a static prefix in build-time i.e. creating the .js file, and the replacement code below matches
# tokens with the same prefix.
PREFIX='import.env.'
BASE_PATH=$1


echo "api : $KOBITON_STANDALONE_API_V2_DOCS_URL"
echo "docs: $KOBITON_STANDALONE_DOCS_V2_URL"

function replaceEnvVars() {
  local destFile="$1"
  local ENVIRONMENT_VAR="$KOBITON_ENVIRONMENT"

  if [ "$ENVIRONMENT_VAR" == "standalone" ]; then
    echo "Replace external lib: mermaid.min.js"
    sed -i -e 's~https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js~../../../assets/js/mermaid.min.js~g' "$destFile"
  fi

  # For value that can be overridden by environment variables.
  for index in "${DEFAULT_VARS[@]}"; do
    local KEY="${index%%::*}"
    local DEFAULT_VAR="${index##*::}"
    local ENV_VAR=$(eval "echo \$$KEY")

    [ -z $ENV_VAR ] && VALUE=$DEFAULT_VAR || VALUE=$ENV_VAR

    if [ "$KEY" == "KOBITON_STANDALONE_DOCS_V2_URL" ]; then
      eval "sed -i -e 's~https://docs.kobiton.com~$VALUE~g' $destFile"
    elif [ "$KEY" == "KOBITON_STANDALONE_API_V2_DOCS_URL" ]; then
      eval "sed -i -e 's~https://api.kobiton.com/v2/docs~$VALUE~g' $destFile"
    else
      echo "None of the condition met"
    fi
  done
}

function main() {
  replaceEnvVars "$BASE_PATH/widget/index.html"
}

main
