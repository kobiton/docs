# Beautifies logs in 'logs/' and adds 'xref:' attributes so
# maintainers can directly open files from the preview panel.

import os
import re
from collections import defaultdict

# Log location
log_files = ['logs/docs-logs.adoc', 'logs/widget-logs.adoc']


# Get errors from logs
def get_errors(log):
    error_regex = r"\[(.*?)\] ERROR \(asciidoctor\): (target of image not found): (.*?)\n\s*file: (.*?)\n"
    errors = defaultdict(lambda: defaultdict(list))

    with open(log, 'r') as f:
        log_content = f.read()

    # Get the and group relevant error information
    matches = re.findall(error_regex, log_content)
    for match in matches:
        timestamp, error_type, error_target, file = match
        errors[error_type][error_target].append(file)

    return errors


# Sort errors alphabetically by column: type, error, module, file.
def sort_errors(errors):
    sorted_errors = defaultdict(lambda: defaultdict(list))

    # Flatten errors to a list for sorting
    error_list = [(error_type, target, file)
                  for error_type, targets in errors.items()
                  for target, files in targets.items()
                  for file in files]

    # Sort list based on type, error, module, and file
    error_list.sort(key=lambda x: (x[0], x[1], x[2].split('/')[x[2].split('/').index('modules') + 1], x[2]))

    # Rebuild dictionary structure
    for error_type, target, file in error_list:
        sorted_errors[error_type][target].append(file)

    return sorted_errors


# Convert errors in into an AsciiDoc table with direct links to files
def reformat_errors(logfile, errors):
    log_type = os.path.basename(logfile).split('-')[0].capitalize()

    # Table header
    output = f'= {log_type} logs\n\n' \
             f'[cols="1,1,1,1"]\n' \
             f'|===\n' \
             f'|Type|Error|Module|File\n\n'

    # Table contents
    for error_type, targets in errors.items():
        for target, files in targets.items():
            for file in files:
                path_parts = file.split('/')
                module_index = path_parts.index('modules')
                module = path_parts[module_index + 1]
                new_path_parts = path_parts[path_parts.index('docs') + 1:]
                new_file_path = "/".join(new_path_parts)
                output += f'|{error_type}\n|{target}\n|{module}\n|xref:../{new_file_path}[{new_path_parts[-1]}]\n'

    # Table footer
    output += '|==='

    # Overwrite log file
    with open(logfile, 'w') as f:
        f.write(output)


# Run script
def run_script():
    for logfile in log_files:
        errors = get_errors(logfile)
        sorted_errors = sort_errors(errors)
        reformat_errors(logfile, sorted_errors)


run_script()
