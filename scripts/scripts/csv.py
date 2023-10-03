#!/usr/bin/env python3

# Creates a '.csv' file containing a full list of site URLs to add to a spreadsheet for large-scale docs reviews.

import os
import csv
from html.parser import HTMLParser
from utils.root import get_project_root


# Use HTMLParser to parse through the generated site's primary './build/index.html' file.
class MyHTMLParser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.recording = 0
        self.data = []
        self.temp_data = ('', '')
        self.ignore_list = ['api-reference', 'widget', 'release-notes']
        self.title = ''

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            if self.recording:
                self.recording += 1
            for name, value in attrs:
                if name == 'class' and value == 'nav-link':
                    self.recording = 1
                if self.recording and name == 'href':
                    if any(item in value for item in self.ignore_list) and value != '/release-notes/index.html':
                        self.recording = 0
                    else:
                        self.temp_data = (self.title, '', value)
        elif tag == 'title':
            self.recording = 2

    def handle_endtag(self, tag):
        if tag == 'a' and self.recording == 1:
            self.recording -= 1
            if self.recording == 0:
                self.data.append(self.temp_data)
        elif tag == 'title':
            self.recording = 0

    def handle_data(self, data):
        if self.recording == 1:
            self.temp_data = (self.temp_data[0], data, self.temp_data[2])
        elif self.recording == 2:
            self.title = data


# Create output file
output_file = "site-urls.csv"


# Extracts the section from a given href.
def extract_section_from_href(href):
    # Split the href using '/'
    parts = href.split('/')

    # Remove any empty strings due to leading or trailing slashes
    parts = [part for part in parts if part]

    # Extract everything except the last part
    section = "/".join(parts[:-1])

    return section


# Formats the section path for display.
def format_section(section):
    # Split the section by '/'
    parts = section.split('/')

    # Convert each part to title case
    parts = [part.replace('-', ' ').title() for part in parts]

    # Join the parts with ' > ' and return
    return ' > '.join(parts)


# Main function to create the CSV file containing site URLs and metadata.
def main():
    # Set the directory to search using get_project_root() directly
    search_directory = os.path.join(get_project_root(), 'build/docs/')

    # Parse the index.html to get links
    with open(os.path.join(search_directory, 'index.html'), 'r') as f:
        parser = MyHTMLParser()
        parser.feed(f.read())

    # Open the output CSV file
    with open(os.path.join(get_project_root(), output_file), 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)

        # Write CSV headers
        writer.writerow(['SME', 'Status', 'Implemented', 'Doc Section', 'Doc Title', 'Doc Link', 'Review Link'])

        # For each link, write the data to the CSV
        for _, doc_title, href in parser.data:
            doc_section = extract_section_from_href(href)

            # Format the doc_section
            formatted_section = format_section(doc_section)

            # If the doc_section is blank, set it to doc_title
            if not formatted_section:
                formatted_section = doc_title.title()

            # Updated the doc_link structure to reflect new URL pattern
            doc_link = f"https://docs.kobiton.com/{href}"

            writer.writerow(['', '', '', formatted_section, doc_title, doc_link, ''])


if __name__ == "__main__":
    main()
