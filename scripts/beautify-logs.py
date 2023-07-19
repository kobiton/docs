# Beautifies logs in 'logs/' and adds 'xref:' attributes so
# maintainers can directly open files from the preview panel.

import os
import re
from collections import defaultdict

# function to extract error information from a given log file
def get_logs(logfile):
    # define the regex pattern to match error messages
    error_regex = r"\[(.*?)\] ERROR \(asciidoctor\): (target of image not found): (.*?)\n\s*file: (.*?)\n"
    # create a defaultdict to store the errors, categorized by error type and target
    errors = defaultdict(lambda: defaultdict(list))

    # open and read the log file
    with open(logfile, 'r') as f:
        log_content = f.read()

    # find matches of the regex pattern in the log content
    matches = re.findall(error_regex, log_content)
    # for each match, store the timestamp, error type, error target and file in the 'errors' dictionary
    for match in matches:
        timestamp, error_type, error_target, file = match
        errors[error_type][error_target].append(file)

    # return the dictionary of errors
    return errors

# function to write the error information back to the log file in a new format
def reformat_errors(logfile, errors):
    # get the log type from the file name
    log_type = os.path.basename(logfile).split('-')[0].capitalize()

    # start the asciidoctor table
    output = f'= {log_type} logs\n\n[cols="1,1,1,1"]\n|===\n|Type|Error|Module|File\n\n'

    # for each error, write the type and target of the error, and the transformed file path
    for error_type, targets in errors.items():
        for target, files in targets.items():
            for file in files:
                # split the file path into parts
                path_parts = file.split('/')
                # find the index of 'modules' in the path parts
                module_index = path_parts.index('modules')
                # take the next part after 'modules' as the module name
                module = path_parts[module_index + 1]
                # create a new path starting from the part after 'docs'
                new_path_parts = path_parts[path_parts.index('docs') + 1:]
                # join the new path parts into a string
                new_file_path = "/".join(new_path_parts)
                output += f'|{error_type}\n|{target}\n|{module}\n|xref:../{new_file_path}[{new_path_parts[-1]}]\n'

    output += '|==='

    # open the log file for writing and write the output
    with open(logfile, 'w') as f:
        f.write(output)

# list of log files to process
log_files = ['logs/docs-logs.adoc', 'logs/widget-logs.adoc']

# for each log file, extract the error information and write it back in the new format
for logfile in log_files:
    errors = get_logs(logfile)
    reformat_errors(logfile, errors)
