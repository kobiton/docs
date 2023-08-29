# Adds the module name to the path of all 'xref:'and 'image:' AsciiDoc attributes.

import re


# Add the module name to each xref attribute.
def add_to_xref(content, filename):
    module_name = filename.split('/docs/modules/', 1)[1].split('/', 1)[0]
    xref_pattern = r"xref:((?!{}:)[^:#]+\.adoc[^[]*\[[^\]]*\])".format(module_name)
    return [re.sub(xref_pattern, f"xref:{module_name}:\\1", line) for line in content]


# Add the module name to each image attribute.
def add_to_image(content, filename):
    module_name = filename.split('/docs/modules/', 1)[1].split('/', 1)[0]
    image_pattern = r"image:((?!{}:)[^:]+\.png\[[^\]]*\])".format(module_name)
    updated_lines = []

    for line in content:
        if '$' in line:
            updated_lines.append(line)
        else:
            updated_lines.append(re.sub(image_pattern, f"image:{module_name}:\\1", line))
    return updated_lines


# Run script
def add_module_to_attributes(filename):
    with open(filename, 'r') as f:
        content = f.readlines()

    content = add_to_xref(content, filename)
    content = add_to_image(content, filename)

    with open(filename, 'w') as f:
        f.writelines(content)
