#!/usr/bin/env python3

# A general cleanup script that adds the relative module to each AsciiDoc attribute,
# adds spaces after periods if they're missing, fixes all newlines, and fixes all URLs.
#
# This is preformed using the following:
# '../utils/modules.py'
# '../utils/spaces.py'
# '../utils/newlines.py'
# '../utils/urls.py'

import os
import glob
import importlib
from utils.root import get_project_root

# Scripts to run from '../utils/'.
SCRIPTS = {
    'modules': 'utils.modules.modules',
    'spaces': 'utils.spaces.spaces',
    'newlines': 'utils.fix_newlines.fix_newlines',
    'urls': 'utils.urls.urls'
}

# Directories in '<project-root>/docs/utils/' to ignore.
IGNORED_DIRECTORIES = ['release-notes', 'widget', 'about-version', 'ROOT']


# Go to '<project-root>/docs/utils/' and run all 'SCRIPTS' against each file not in 'IGNORED_DIRECTORIES'.
def main():
    root = get_project_root()
    modules_path = os.path.join(root, 'docs', '../utils')

    for module in os.listdir(modules_path):
        module_path = os.path.join(modules_path, module)
        if not os.path.isdir(module_path) or module in IGNORED_DIRECTORIES:
            continue

        for filename in glob.glob(module_path + '/**/*.adoc', recursive=True):
            if not any(ignore_dir in os.path.relpath(filename, module_path).split(os.sep)
                       for ignore_dir in IGNORED_DIRECTORIES):

                # Dynamically load and execute scripts
                for func_name in SCRIPTS.values():
                    module_name, function_name = '.'.join(func_name.split('.')[:-1]), func_name.split('.')[-1]
                    module = importlib.import_module(module_name)
                    getattr(module, function_name)(filename)


if __name__ == "__main__":
    main()
