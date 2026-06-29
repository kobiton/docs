#!/bin/bash

# Get the project root directory.
PROJECT_ROOT=$(git rev-parse --show-toplevel)

# Set the temporary file path.
TEMP_FILE_DOCS="$PROJECT_ROOT/ui-bundle-docs/css/temp.css"
TEMP_FILE_WIDGET="$PROJECT_ROOT/ui-bundle-widget/css/temp.css"

# Merge all css files to 1 file excluding site.css.
find $PROJECT_ROOT/ui-bundle-docs/css/ -type f -not -name 'site.css' -name '*.css' -exec cat {} \; | npx postcss --use postcss-import postcss-clean --no-map > "$TEMP_FILE_DOCS"
find $PROJECT_ROOT/ui-bundle-widget/css/ -type f -not -name 'site.css' -name '*.css' -exec cat {} \; | npx postcss --use postcss-import postcss-clean --no-map > "$TEMP_FILE_WIDGET"

# Remove all comments from the merged files (anything between /* and */).
if [[ "$KOBITON_ENVIRONMENT" == "standalone" ]]; then
  # Somehow the sed command with '' doesn't work on images in the standalone environment.
  sed -i 's/\/\*.*\*\///g' "$TEMP_FILE_DOCS"
  sed -i 's/\/\*.*\*\///g' "$TEMP_FILE_WIDGET"
else
  # Local build & S3 build (production) needs a ''.
  # Note that, the S3 and standalone arch is "Linux", local arch is "Darwin" (MacOS).
  sed -i '' 's/\/\*.*\*\///g' "$TEMP_FILE_DOCS"
  sed -i '' 's/\/\*.*\*\///g' "$TEMP_FILE_WIDGET"
fi

# Append the header comment.
echo -e "/* DO NOT EDIT: 'site.css' is auto-generated from the minified output of 'default-styles.css' and 'custom-styles.css'. */\n$(cat $TEMP_FILE_DOCS)" > "$TEMP_FILE_DOCS"
echo -e "/* DO NOT EDIT: 'site.css' is auto-generated from the minified output of 'default-styles.css' and 'custom-styles.css'. */\n$(cat $TEMP_FILE_WIDGET)" > "$TEMP_FILE_WIDGET"

# Calculate the original checksum.
ORIGINAL_CHECKSUM_DOCS=$(openssl dgst -md5 "$PROJECT_ROOT/ui-bundle-docs/css/site.css" | cut -d ' ' -f2)
ORIGINAL_CHECKSUM_WIDGET=$(openssl dgst -md5 "$PROJECT_ROOT/ui-bundle-widget/css/site.css" | cut -d ' ' -f2)

# Calculate the new checksum.
NEW_CHECKSUM_DOCS=$(openssl dgst -md5 "$TEMP_FILE_DOCS" | cut -d ' ' -f2)
NEW_CHECKSUM_WIDGET=$(openssl dgst -md5 "$TEMP_FILE_WIDGET" | cut -d ' ' -f2)

# Compare original and new checksum.
if [[ "$ORIGINAL_CHECKSUM_DOCS" == "$NEW_CHECKSUM_DOCS" ]]; then
  rm "$TEMP_FILE_DOCS"
else
  mv "$TEMP_FILE_DOCS" "$PROJECT_ROOT/ui-bundle-docs/css/site.css"
fi

if [[ "$ORIGINAL_CHECKSUM_WIDGET" == "$NEW_CHECKSUM_WIDGET" ]]; then
  rm "$TEMP_FILE_WIDGET"
else
  mv "$TEMP_FILE_WIDGET" "$PROJECT_ROOT/ui-bundle-widget/css/site.css"
fi
