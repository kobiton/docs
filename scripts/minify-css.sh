#!/bin/bash

# Get the project root directory
PROJECT_ROOT=$(git rev-parse --show-toplevel)

# Set the temporary file path
TEMP_FILE="$PROJECT_ROOT/ui-bundle-docs/css/temp.css"

# Install dependencies if needed
npm install postcss-cli postcss-import postcss-clean

# Merge all css files to 1 file
$PROJECT_ROOT/scripts/merge-css.sh $PROJECT_ROOT/ui-bundle-docs/css/
$PROJECT_ROOT/scripts/merge-css.sh $PROJECT_ROOT/ui-bundle-widget/css/

MERGE_FILE_DOCS="$PROJECT_ROOT/ui-bundle-docs/css/merged.css"
MERGE_FILE_WIDGET="$PROJECT_ROOT/ui-bundle-widget/css/merged.css"

# Generate the minified CSS with custom header
{
  echo "/*! DO NOT EDIT: 'site.css' is auto-generated from the minified output of 'default-styles.css' and 'custom-styles.css'. */"
  npx postcss "$MERGE_FILE_DOCS" --use postcss-import postcss-clean --no-map
} > "$PROJECT_ROOT/ui-bundle-docs/css/site.css"

{
  echo "/*! DO NOT EDIT: 'site.css' is auto-generated from the minified output of 'default-styles.css' and 'custom-styles.css'. */"
  npx postcss "$MERGE_FILE_WIDGET" --use postcss-import postcss-clean --no-map
} > "$PROJECT_ROOT/ui-bundle-widget/css/site.css"


# Remove the temporary file
rm "$MERGE_FILE_DOCS"
rm "$MERGE_FILE_WIDGET"

echo "CSS minification completed."
