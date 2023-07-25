#!/usr/bin/env python3

# Beautifies logs in 'logs/' and adds 'xref:' attributes so
# maintainers can directly open files from the preview panel.

import os
import json
from collections import defaultdict

# Constants
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
LOG_FILES = [os.path.join(SCRIPT_DIR, '../logs/docs-logs.adoc'), os.path.join(SCRIPT_DIR, '../logs/widget-logs.adoc')]
ANTORA_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug']


# Get the logs and create a dictionary for building beautified logs
def get_logs(log):
    logs = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    with open(log, 'r') as f:
        for line in f:
            data = json.loads(line)
            log_type = data['level']
            absolute_file_path = data['file']['path']
            worktree_path = data['source']['worktree']
            issue, log_target = data['msg'].split(': ')

            # Removing the worktree path from the absolute file path
            relative_file_path = absolute_file_path.replace(worktree_path, '', 1)

            logs[log_type][issue][log_target].append(relative_file_path)

    return logs


# Sort logs alphabetically by column: type, issue, module, file.
def sort_logs(logs):
    sorted_logs = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    # Flatten logs to a list for sorting
    log_list = [(log_type, issue, log_target, file)
                for log_type, issues in logs.items()
                for issue, log_targets in issues.items()
                for log_target, files in log_targets.items()
                for file in files]

    # Sort list based on type, issue, module, and file
    log_list.sort(key=lambda x: (
        x[0], x[1], x[3].split('/')[x[3].split('/').index('modules') + 1] if 'modules' in x[3] else x[3], x[3]))

    # Rebuild dictionary structure
    for log_type, issue, log_target, file in log_list:
        sorted_logs[log_type][issue][log_target].append(file)

    return sorted_logs


# Count the number of issues per log type
def count_issues(logs):
    total = defaultdict(int)

    for log_type, issues in logs.items():
        for issue, log_targets in issues.items():
            for log_target, files in log_targets.items():
                total[log_type] += len(files)

    return total


# Reformat logs into a table
def reformat_logs(logfile, logs):
    # Get total issue counts
    total = count_issues(logs)

    # Create file heading
    antora_playbook = os.path.basename(logfile).split('-')[0].capitalize()
    output = f'= {antora_playbook} logs\n\n'

    # Create a table of contents
    output += f'.Table of contents\n'
    for type in ANTORA_LEVELS:
        count = total.get(type, 0)
        count_str = f': {count} issue(s)' if count > 0 else ': _NONE_'
        output += f'* xref:_{type.split()[0].lower()}[]{count_str}\n'

    output += f'\n'

    for type in ANTORA_LEVELS:
        # Add anchor to headers
        output += f'[#_{type.split()[0].lower()}]\n'

        # If there are logs for this log type, create a table
        if type in logs:
            output += f'== {type.split()[0].upper()}\n\n' \
                      f'[cols="1,1,1,1"]\n' \
                      f'|===\n' \
                      f'|Issue type|Issue|Module|File\n\n'
            for issue, log_targets in logs[type].items():
                for log_target, files in log_targets.items():
                    for file in files:
                        # Get the file cross-reference link from 'relative_file_path'
                        module = file.split('modules/')[1].split('/')[0]
                        file_name = file.split('/')[-1]
                        output += f'|{issue}\n|{log_target}\n|{module}\n|xref:..{file}[{file_name}]\n'
            output += '|===\n\n'
        # If there are no logs for this log type, print NONE
        else:
            # If there are no logs, write NONE
            output += f'== {type.split()[0].upper()}\n\n_NONE_\n\n'

    # Overwrite log file
    with open(logfile, 'w') as f:
        f.write(output)


# Run script
def run_script():
    for file in LOG_FILES:
        logs = get_logs(file)
        sorted_logs = sort_logs(logs)
        reformat_logs(file, sorted_logs)


run_script()
