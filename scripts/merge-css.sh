#!/bin/bash

# Check if the folder is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <folder>"
  exit 1
fi

# Set the input folder and output file
input_folder="$1"
output_file="$1/merged.css"

# Remove the output file if it exists
if [ -f "$output_file" ]; then
  rm "$output_file"
fi

# Loop through all the CSS files in the input folder
for file in "$input_folder"/*.css; do
  # Append the content of the CSS file to the output file
  cat "$file" >> "$output_file"

  # Add a newline to separate the content of the files
  echo "" >> "$output_file"

done
