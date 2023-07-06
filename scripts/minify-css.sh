#!/bin/bash

# Get the project root directory
PROJECT_ROOT=$(git rev-parse --show-toplevel)

# Set the temporary file path
TEMP_FILE="$PROJECT_ROOT/ui-bundle-docs/css/temp.css"

# Install dependencies if needed
npm install postcss-cli postcss-import postcss-clean

# Concatenate the CSS files
cat "$PROJECT_ROOT/ui-bundle-docs/css/default-styles.css" "$PROJECT_ROOT/ui-bundle-docs/css/custom-styles.css" > "$TEMP_FILE"

# Generate the minified CSS with custom header
{
  echo "/*! DO NOT EDIT: 'site.css' is auto-generated from the minified output of 'default-styles.css' and 'custom-styles.css'. */"
  npx postcss "$TEMP_FILE" --use postcss-import postcss-clean --no-map
} > "$PROJECT_ROOT/ui-bundle-docs/css/site.css"

# Remove the temporary file
rm "$TEMP_FILE"

echo "CSS minification completed."
