#!/usr/bin/env python3

# Minifies CSS files in the UI bundle directory which improves site performance, while allowing
# contributors to make design changes more easily. 'minify_css' only replaces 'site.css' if changes to
# CSS files are made.

import os
import subprocess
import hashlib
from modules.get_project_root import get_project_root


# Get the project root directory
PROJECT_ROOT = get_project_root()
DIRECTORIES = ['docs', 'widget']   # If more than one UI bundle, add its name (i.e. 'docs', 'widget'). Otherwise, leave blank.


# Get the path to the 'current_directory'. If 'current_directory' is empty,
# use the default UI bundle directory, i.e. 'ui-bundle/css/'.
def get_directory_path(current_directory):
    if current_directory == "":
        return os.path.join(PROJECT_ROOT, "ui-bundle/css/")
    else:
        return os.path.join(PROJECT_ROOT, f"ui-bundle-{current_directory}/css/")


def merge_and_minify_css_files(directory, output_file):
    merged_content = ""
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.css') and file != 'site.css':
                with open(os.path.join(root, file), 'r') as f:
                    merged_content += f.read()

    # Use postcess to minify css files.
    with open(output_file, 'w') as f:
        process = subprocess.Popen(['npx', 'postcss', '--use', 'postcss-import', 'postcss-clean', '--no-map'],
                                   stdin=subprocess.PIPE, stdout=f)
        process.communicate(input=merged_content.encode())


def remove_comments_and_append_header(file_path):
    with open(file_path, 'r') as f:
        content = f.readlines()

    # Remove comments
    content = [line for line in content if not line.strip().startswith("/*") and not line.strip().endswith("*/")]

    # Add header
    header = "/* DO NOT EDIT: 'site.css' is auto-generated from the minified output of " \
             "'default-styles.css' and 'custom-styles.css'. */\n"
    content.insert(0, header)

    with open(file_path, 'w') as f:
        f.writelines(content)


def calculate_md5(file_path):
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()


# Minify the 'site.css' file located in 'DIRECTORIES', but only if
# changes where made to one or more CSS file in that directory.
def minify_css():
    for directory in DIRECTORIES:
        temp_file = os.path.join(get_directory_path(directory), "temp.css")
        merge_and_minify_css_files(get_directory_path(directory), temp_file)
        remove_comments_and_append_header(temp_file)

        original_checksum = calculate_md5(os.path.join(get_directory_path(directory), "site.css"))
        new_checksum = calculate_md5(temp_file)

        if original_checksum != new_checksum:
            os.rename(temp_file, os.path.join(get_directory_path(directory), "site.css"))
        else:
            os.remove(temp_file)


if __name__ == "__main__":
    minify_css()
