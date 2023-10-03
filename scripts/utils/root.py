# DESCRIPTION

import subprocess


# Get the root of the current git project.
def get_project_root():
    return subprocess.check_output(['git', 'rev-parse', '--show-toplevel']).decode('utf-8').strip()
