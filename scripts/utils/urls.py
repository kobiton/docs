# Adds the Asciidoc 'link:' attribute and removes localization codes from all URLs.

import re
from ignore import ignore_styling

# A list of the top URL localization codes.
localization_codes = [
    # North America
    'en-us', 'en-ca', 'es-mx',

    # South America
    'pt-br', 'es-ar', 'es-cl', 'es-co', 'es-pe',

    # Europe
    'bg-bg', 'ca-es', 'cs-cz', 'da-dk', 'de-de', 'el-gr', 'es-es', 'et-ee',
    'fi-fi', 'fr-fr', 'hr-hr', 'hu-hu', 'it-it', 'lt-lt', 'lv-lv', 'nl-nl',
    'pl-pl', 'pt-pt', 'ro-ro', 'ru-ru', 'sk-sk', 'sl-si', 'sr-sp', 'sv-se',
    'uk-ua',

    # Africa
    'ar-sa', 'fr-fr', 'en-gb', 'es-es',

    # Asia
    'bn-bd', 'gu-in', 'he-il', 'hi-in', 'id-id', 'ja-jp', 'kk-kz', 'kn-in',
    'ko-kr', 'lo-la', 'ml-in', 'mr-in', 'ms-my', 'ne-np', 'pa-in', 'si-lk',
    'ta-in', 'te-in', 'th-th', 'ur-pk', 'vi-vn', 'zh-cn', 'zh-hk',

    # Oceania
    'as-in', 'en-au', 'en-nz',

    # Other
    'fil-ph', 'my-mm', 'nb-no', 'sd-in',
]

# Styling patterns to ignore
ignore = ignore_styling(attributes=True, urls=False, code=True)


# Function to prepend "link:" before "http://" or "https://"
def prepend_link(text):
    return re.sub(r'(?<!link:)(https?://)', r'link:\1', text)


# Function to remove localizations
def remove_localization(text):
    for code in localization_codes:
        # Match localization code that is preceded by "/" and followed by "/" or "["
        text = re.sub(r'(?<=/)' + re.escape(code) + r'(?=[/\[])', '', text)
    # remove double slashes that are not part of http:// or https://
    text = re.sub(r'(?<!http:)(?<!https:)//', '/', text)
    return text


# Function to process each Asciidoc file
def fix_urls(filename):
    with open(filename, 'r') as file:
        content = file.read()

    # Use regex to separate the content into blocks
    code_blocks = re.findall(ignore, content)
    non_code_blocks = re.split(ignore, content)

    # Apply the function only to the non-code blocks
    for i, block in enumerate(non_code_blocks):
        if block not in code_blocks:
            # Apply prepend_link and remove_localization to the block
            non_code_blocks[i] = remove_localization(prepend_link(block))

    # Join processed non-code blocks to get the corrected content
    corrected_content = ''.join(non_code_blocks)

    # Write the corrected content back to the file
    with open(filename, 'w') as file:
        file.write(corrected_content)
