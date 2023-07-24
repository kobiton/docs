#!/usr/bin/env python3

# Beautifies logs in 'logs/' and adds 'xref:' attributes so
# maintainers can directly open files from the preview panel.

import os
import re
import subprocess
from collections import defaultdict


# Get git root path
def get_git_root_path():
    return subprocess.check_output(["git", "rev-parse", "--show-toplevel"]).strip().decode('utf-8')


git_root = get_git_root_path()

# Get log location
log_files = [os.path.join(git_root, 'logs/docs-logs.adoc'), os.path.join(git_root, 'logs/widget-logs.adoc')]


# Get errors from logs
def get_logs(log):
    log_regex = r"\[(.*?)\] (.*? \(asciidoctor\)): (.*?): (.*?)\n\s*file: (.*?)\n"
    logs = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    with open(log, 'r') as f:
        log_content = f.read()

    # Get and group relevant log information
    matches = re.findall(log_regex, log_content)
    for match in matches:
        timestamp, log_type, issue, log_target, file = match
        logs[log_type][issue][log_target].append(file)

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


def reformat_logs(logfile, logs):
    antora_playbook = os.path.basename(logfile).split('-')[0].capitalize()
    log_types = ['FATAL (asciidoctor)', 'ERROR (asciidoctor)', 'WARN (asciidoctor)', 'INFO (asciidoctor)',
                 'DEBUG (asciidoctor)']

    # Get total issue counts
    total = count_issues(logs)

    output = f'= {antora_playbook} logs\n\n' \
             f'.Table of contents\n'

    # Create a table of contents
    for type in log_types:
        count = total.get(type, 0)
        count_str = f': {count} issue(s)' if count > 0 else ': _NONE_'
        output += f'* xref:_{type.split()[0].lower()}[]{count_str}\n'

    output += f'\n'

    for type in log_types:
        # Add anchor to headers
        output += f'[#_{type.split()[0].lower()}]\n'

        # If there are logs for this log type, create a table
        if type in logs:
            output += f'== {type.split()[0].capitalize()}\n\n' \
                      f'[cols="1,1,1,1"]\n' \
                      f'|===\n' \
                      f'|Issue type|Issue|Module|File\n\n'
            for issue, log_targets in logs[type].items():
                for log_target, files in log_targets.items():
                    for file in files:
                        path_parts = file.split('/')
                        module_index = path_parts.index('modules')
                        module = path_parts[module_index + 1]
                        new_path_parts = path_parts[path_parts.index('docs') + 1:]
                        new_file_path = "/".join(new_path_parts)
                        output += f'|{issue}\n|{log_target}\n|{module}\n|xref:../{new_file_path}[{new_path_parts[-1]}]\n'
            output += '|===\n\n'
        else:
            # If there are no logs, write NONE
            output += f'== {type.split()[0].capitalize()}\n\n_NONE_\n\n'

    # Overwrite log file
    with open(logfile, 'w') as f:
        f.write(output)


# Run script
def run_script():
    for logfile in log_files:
        absolute_logfile_path = os.path.join(git_root, logfile)
        logs = get_logs(absolute_logfile_path)
        sorted_logs = sort_logs(logs)
        reformat_logs(absolute_logfile_path, sorted_logs)


run_script()
