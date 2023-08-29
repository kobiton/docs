# Adds a space after a period if one is missing between two sentences.
# Spaces won't be added to code-styled content, AsciiDoc attributes and links, or version numbers.

import re
from scripts.modules.ignore_styling import ignore_styling

# Styling patterns to ignore
styling_to_ignore = ignore_styling(attributes=True, urls=True, code=True)


# Add a space if one is missing after a period.
# This excludes periods followed by a number,
# followed by single or double quotes,
# or located at the start of a line.
def add_missing_space(text):
    return re.sub(
        r'(?<!^)\.(?![\d+\s\'"])', '. ',
        text, flags=re.MULTILINE)


# Separates file text into code blocks and non-code blocks,
# then runs 'add_missing_space()' against non-code block text only.
def add_spaces_after_periods(filename):
    # Open and read the current file.
    with open(filename, 'r') as file:
        text = file.read()

    # Make list 'styled_text' with any string that matches 'styling_to_ignore' in 'text',
    # Make list 'none_styled_text' with any string that does not match 'styling_to_ignore' in 'text'.
    styled_text = re.findall(styling_to_ignore, text)
    normal_text = re.split(styling_to_ignore, text)

    # Loop through each string in 'normal_text'.
    # If the current string does not match a string in 'styled_text',
    # run 'add_missing_space()' against the string.
    for i, text in enumerate(normal_text):
        if text not in styled_text:
            normal_text[i] = add_missing_space(text)

    # Join processed non-code blocks to get the corrected content
    corrected_content = ''.join(normal_text)

    # Write the corrected content back to the file
    with open(filename, 'w') as file:
        file.write(corrected_content)
