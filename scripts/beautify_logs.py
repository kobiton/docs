#!/usr/bin/env python3

# Beautifies logs in 'logs/' and adds 'xref:' attributes so
# maintainers can directly open files from the preview window.

import os
import json
from collections import defaultdict
from modules.get_project_root import get_project_root

# Get the project root directory
PROJECT_ROOT = get_project_root()
ANTORA_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug']
MULTIPLE_LOGS = ['docs', 'widget']  # If more than one Antora playbook, add its name (i.e. 'docs', 'widget').


# Check if there are multiple input log files and return the input file for each one.
def get_input_file():
    if not MULTIPLE_LOGS:
        return [os.path.join(PROJECT_ROOT, 'logs/default.json')]
    else:
        return [os.path.join(PROJECT_ROOT, f'logs/default-{name}.json') for name in MULTIPLE_LOGS]


# Check if there are multiple input log files and return the output file for each one.
def get_output_file():
    if not MULTIPLE_LOGS:
        return [os.path.join(PROJECT_ROOT, 'logs/beautified.adoc')]
    else:
        return [os.path.join(PROJECT_ROOT, f'logs/beautified-{name}.adoc') for name in MULTIPLE_LOGS]


# Check if there are multiple input log files and return a title for each one's output file.
def get_title(log_name=None):
    if log_name is None:
        return 'Beautified logs'
    else:
        return f'Beautified {log_name.lower()} logs'


# For each log file, create a dictionary with the following information:
# 'data', 'log_type', 'absolute_file_path', 'local_path', and 'issue'
def create_dictionary(default_log):
    # Initialize a new dictionary.
    dictionary = defaultdict(lambda: defaultdict(dict))

    for entry in default_log:
        # Get default JSON logs.
        log = json.loads(entry)

        # First-level dictionary
        antora_level = log['level']

        # Second-level dictionary.
        unique_id = log['time']

        # Variables for second-level dictionary.
        message = log['msg']
        path = os.path.relpath(log['file']['path'], PROJECT_ROOT)
        module = path.split('modules/')[1].split('/')[
            0] if 'modules' in path else 'N/A'
        xref = f"xref:../{path}[{path.split('/')[-1]}]"
        line = log['file'].get('line', 'N/A')

        # Create the following dictionary using the previous variables.
        dictionary[antora_level][unique_id] = {
            'message': message,
            'path': path,
            'module': module,
            'xref': xref,
            'line': line
        }

    return dictionary


# Sort logs alphabetically by column: type, issue, module, file.
def sort_dictionary(created_dictionary):
    sorted_dictionary = defaultdict(lambda: defaultdict(list))

    # Iterate through first two levels of dictionary (log_type, issue).
    for log_type, issues in created_dictionary.items():
        for issue, details in issues.items():
            # No need to sort 'details.values()' directly, sort a list containing 'details'.
            sorted_details = sorted([details], key=lambda x: x['path'])
            sorted_dictionary[log_type][issue] = sorted_details

    return sorted_dictionary


# Count the number of issues for reach 'antora_level'.
def count_issues(sorted_dictionary):
    total = defaultdict(int)

    for antora_level, unique_ids in sorted_dictionary.items():
        if len(unique_ids) > 0:
            total[antora_level] = len(unique_ids)
        else:
            total[antora_level] = 0

    return total


# Reformat logs into a table
def create_table(sorted_dictionary, current_log):
    # Set title
    table = f'= {current_log}\n\n'

    # Create table of contents with count of issues.
    table += f'.Table of contents\n'
    count_of_issues = count_issues(sorted_dictionary)
    for level in ANTORA_LEVELS:
        count = count_of_issues.get(level, 0)
        table += f'* xref:_{level}[]: {count} issue(s)\n'

    table += f'\n'

    # Create data table
    for level in ANTORA_LEVELS:
        table += f'[#_{level}]\n'
        table += f'== {level.upper()}\n\n'
        if level in sorted_dictionary:
            table += f'[cols="1,1,1,1"]\n'
            table += f'|===\n'
            table += f'|Issue|Module|File|Line\n\n'
            for antora_level, unique_id in sorted_dictionary[level].items():
                for issue_details in unique_id:
                    table += f"|{issue_details['message']}\n" \
                             f"|{issue_details['module']}\n" \
                             f"|{issue_details['xref']}\n" \
                             f"|{issue_details['line']}\n\n"
            table += '|===\n\n'
        else:
            table += f'_NONE_\n\n'

    return table


# For each input file in 'MULTIPLE_LOGS' create a dictionary, sort the dictionary, create a table, then
# write the table to the relevant output file.
def beautify_logs():
    input_log_files = get_input_file()
    output_log_files = get_output_file()

    # Open each file and run 'beautify_logs()'.
    for log_name, log_details in enumerate(input_log_files):

        # Read the content of the input log
        with open(log_details, 'r') as f:
            default_log = f.readlines()

        log_title = get_title(MULTIPLE_LOGS[log_name] if MULTIPLE_LOGS else None)
        beautified_logs = create_table(sort_dictionary(create_dictionary(default_log)), log_title)

        # Write the processed content to the output file
        with open(output_log_files[log_name], 'w') as f:
            f.write(beautified_logs)


if __name__ == "__main__":
    beautify_logs()
