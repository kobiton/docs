#!/bin/bash
# This script replaces patterns inside static files to their respective environment variable.
# For example, to replace value in the index.html file in the <path/to/portal/build/dist>:
#   bash replace-env-vars.sh <path/to/portal/build/dist>

# This is a workaround to use associative array on bash version 3
# For more information: https://stackoverflow.com/a/17992349/5006288
# Format: '<env var name>::<default value>'

# Note: with static files, these default values are hardcoded (in .yml file).
DEFAULT_VARS=(
    'KOBITON_STANDALONE_API_V2_DOCS_URL::https://api.kobiton.com/v2/docs'
    'KOBITON_STANDALONE_DOCS_V2_URL::https://docs.kobiton.com'
)

BASE_PATH=$1

echo "KOBITON_ENVIRONMENT                : $KOBITON_ENVIRONMENT"
echo "KOBITON_STANDALONE_API_V2_DOCS_URL : $KOBITON_STANDALONE_API_V2_DOCS_URL"
echo "KOBITON_STANDALONE_DOCS_V2_URL     : $KOBITON_STANDALONE_DOCS_V2_URL"

function replaceEnvVars() {
  local destFile="$1"

  if [[ "$KOBITON_ENVIRONMENT" == "standalone" ]]; then
    # From step in Dockerfile, "mermaid.min.js" is placed in the directory "_/js/vendor/".
    sed -i -e 's~https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js~/_/js/vendor/mermaid.min.js~g' "$destFile"
  fi

  for index in "${DEFAULT_VARS[@]}"; do
    local KEY="${index%%::*}"
    local DEFAULT_VAR="${index##*::}"
    local ENV_VAR

    ENV_VAR=$(eval "echo \$$KEY")

    sed -i -e "s~$DEFAULT_VAR~$ENV_VAR~g" "$destFile"
  done
}

function main() {
    cd "$BASE_PATH" || (echo "Directory not found! Exiting..." && exit)
    echo "🔨 Replacing env vars in HTML files..."
    # Find all html files recursively within the base directory and replace their env variables.
    find . -type f -name '*.html' | while read -r file; do
      replaceEnvVars "$BASE_PATH/$file"
    done
    echo "✨ Done replacing env vars in HTML files."
}

main
