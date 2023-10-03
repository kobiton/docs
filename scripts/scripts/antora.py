#!/usr/bin/env python3

# Runs the antora command for all 'antora-playbook' files in the project root.
import os
import subprocess
from utils.root import get_project_root

# Get the project root directory
PROJECT_ROOT = get_project_root()


def main():
    # List all files in the project root directory
    files = os.listdir(PROJECT_ROOT)

    # Loop over all files in the directory
    for file in files:
        # Construct full path to the file
        full_path = os.path.join(PROJECT_ROOT, file)

        # Check if the file name contains 'antora-playbook' and ends with '.yml'
        if 'antora-playbook' in file and file.endswith('.yml') and os.path.isfile(full_path):
            # Construct the command
            command = ['antora', full_path]

            # Run the command
            subprocess.run(command)


if __name__ == "__main__":
    main()
