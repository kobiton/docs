# Ensures each line of content is separated by a single newline and every '.adoc' file ends with a newline.

import re
from ignore import ignore_styling

# Styling patterns to ignore
ignore = ignore_styling(attributes=True, urls=True, code=True)


# Add a newline if there's none.
def add_newline(content):
    if content and not content[-1].endswith('\n'):
        content[-1] = content[-1] + '\n'
    return content


# Remove newlines if there's more than one.
def remove_newlines(content):
    # Use regex to separate the content into blocks
    code_blocks = re.findall(ignore, ''.join(content))
    non_code_blocks = re.split(ignore, ''.join(content))

    for i, block in enumerate(non_code_blocks):
        if block not in code_blocks:
            non_code_blocks[i] = re.sub(r'\n{3,}', '\n\n', block)
    return non_code_blocks


# Run script
def fix_newlines(filename):
    with open(filename, 'r') as file:
        content = file.readlines()

    content = add_newline(content)
    non_code_blocks = remove_newlines(content)

    # Use regex to separate the content into blocks
    code_blocks = re.findall(ignore, ''.join(content))
    combined_blocks = re.split(ignore, ''.join(content))

    # Combine the blocks back into the corrected content
    corrected_content = ""
    block_index = 0  # for iterating over non_code_blocks
    for block in combined_blocks:
        if block in code_blocks:
            corrected_content += block
        else:
            corrected_content += non_code_blocks[block_index]
            block_index += 1

    # Write the corrected content back to the file
    with open(filename, 'w') as file:
        file.write(corrected_content)
