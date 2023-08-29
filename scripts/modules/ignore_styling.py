# Ignores any combination of the following AsciiDoc styles:
# Attributes, URLs, inline code, code blocks, and rich text symbols.

import re


def ignore_styling(attributes=False, urls=False, code=False):

    # Define AsciiDoc styling patterns
    attributes_patterns = ['xref:.*?\\]', 'image:.*?\\]', 'include:.*?\\]']
    urls_patterns = ['link:.*?\\]']
    code_patterns = ['`.*?`', '----.*?----']

    ignore = []

    # Append specific patterns to ignore list based on function arguments
    if attributes:
        ignore.extend(attributes_patterns)
    if urls:
        ignore.extend(urls_patterns)
    if code:
        ignore.extend(code_patterns)

    # Compile ignore list into a single regular expression object
    ignore = re.compile(rf'({"|".join(ignore)})', re.DOTALL)

    return ignore
