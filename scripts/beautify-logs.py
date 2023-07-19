#!/usr/bin/env python3

# import necessary Python modules
import os
import re
from collections import defaultdict


# function to extract error information from a given log file
def get_logs(logfile):
    # define the regex pattern to match error messages
    error_regex = r"\[(.*?)\] ERROR \(asciidoctor\): target of (.*?) not found: (.*?)\n\s*file: (.*?)\n"
    # create a defaultdict to store the errors, categorized by error type and target
    errors = defaultdict(lambda: defaultdict(list))

    # open and read the log file
    with open(logfile, 'r') as f:
        log_content = f.read()

    # find matches of the regex pattern in the log content
    matches = re.findall(error_regex, log_content)
    # for each match, store the timestamp, error type, target and file in the 'errors' dictionary
    for match in matches:
        timestamp, error_type, error_target, file = match
        errors[error_type][error_target].append(file)

    # return the dictionary of errors
    return errors


# function to transform a file path into a different format for better referencing
def transform_filepath(filepath):
    # split the file path into parts
    path_parts = filepath.split('/')

    # find the index of 'docs' in the path parts
    doc_index = path_parts.index('docs')

    # create a new path starting from the part after 'docs'
    new_path_parts = path_parts[doc_index + 1:]

    # join the new path parts into a string to be used as link text, skipping the first two parts
    new_file_path = "/".join(new_path_parts[2:])

    # join the new path parts into a string to be used as the link
    full_path = "/".join(new_path_parts)

    # return the cross-reference link in AsciiDoc format
    return f"xref:../{full_path}[{new_file_path}]"


# function to write the error information back to the log file in a new format
def reformat_errors(logfile, errors):
    # get the log type from the file name
    log_type = os.path.basename(logfile).split('-')[0].capitalize()

    # open the log file for writing
    with open(logfile, 'w') as f:
        # write the log type at the top of the file
        f.write(f'= {log_type} logs\n')

        # for each error, write the type and target of the error, and the transformed file path
        for error_type, targets in errors.items():
            f.write(f'\n== {error_type} not found\n')
            for target, files in targets.items():
                f.write(f'\n=== {target}\n\n')
                for file in files:
                    new_file_path = transform_filepath(file)
                    f.write(f'- {new_file_path}\n')


# list of log files to process
log_files = ['logs/docs-logs.adoc', 'logs/widget-logs.adoc']

# for each log file, extract the error information and write it back in the new format
for logfile in log_files:
    errors = get_logs(logfile)
    reformat_errors(logfile, errors)
