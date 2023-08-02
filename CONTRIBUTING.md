# Kobiton Docs contributors guide

Thanks for contributing to Kobiton Docs!
This guide covers how content for [docs.kobiton.com](https://docs.kobiton.com/) is created, organized, and published. Everyone here is expected to adhere to the [Code of Conduct](CODE_OF_CONDUCT.md) so be sure to review before contributing.

If you're new to docs-as-code, start with [First time contributors](#first-time-contributors), otherwise choose a topic below:

## Table of contents

- [First time contributors](#first-time-contributors)
- [Build the docs locally](#build-the-docs-locally)
- [Antora logs](#antora-logs)
- [Antora playbooks and UI bundles](#antora-playbooks-and-ui-bundles)
- [Directory structure](#directory-structure)
- [Site navigation](#site-navigation)
- [Site URLs](#site-urls)
- [Hide a page from search](#hide-a-page-from-search)
- [Partials](#partials)
- [Directory and file names](#directory-and-file-names)
- [Page types and templates](#page-types-and-templates)
- [Style and voice](#style-and-voice)
- [Docker commands](#docker-commands)

## First time contributors

Our docs are managed as docs-as-code, meaning each document is a plain text file stored in a version-controlled repository. Learn more about each topic below:

### Version control

Version control allows our team to work on documents simultaneously without accidentally overwriting each other's work.

- [Learn about Git and GitHub](https://docs.github.com/en/get-started/using-git/about-git)
- [Get started with GitHub](https://docs.github.com/get-started/quickstart/hello-world)
- [Your first pull request](https://docs.github.com/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

### File types and markup language

Our document files are written in a plain text markup language and only contain written content--not design content--allowing our team to separate writing-related tasks from design-related tasks.

- [Learn about the AsciiDoc markup language](https://docs.asciidoctor.org/asciidoc/latest/)
- [Get started with the AsciiDoc markup language](https://asciidoctor.org/docs/asciidoc-writers-guide/)
- [Directory and file names](#directory-and-file-names)
- [Directory structure](#directory-structure)

### Static site generator

The static site generator converts all plain text files to HTML and bundles them with our CSS when you [build the docs locally](#build-the-docs-locally).

- [Learn about Antora](https://docs.antora.org/antora/latest/how-antora-works/)
- [Get started with Antora](https://docs.antora.org/antora/latest/install-and-run-quickstart/)
- [Antora playbooks](#antora-playbooks-and-ui-bundles)

### Publishing

When a commit is merged to our `main` branch in GitHub, the site is automatically published using Docker and GitHub actions.

- [Learn about Docker](https://docs.docker.com/get-started/overview/)
- [Get started with Docker](https://docs.docker.com/get-started/)
- [Docker commands](#docker-commands)
- [Learn about GitHub actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions)
- [Get started with GitHub actions](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow)

## Build the docs locally

We use [Antora](https://docs.antora.org/antora/latest/how-antora-works/) to generate our static site. Before you can use Antora to generate the site locally, you'll need [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/). Run the following commands to see if they're installed:

```plaintext
node --version
yarn --version
```

If Node.js and Yarn are installed, install project dependencies and build the docs locally by running:

```plaintext
yarn install
yarn local
```

## Antora logs

Beautified logs are automatically generated in the `logs` directory when you run `yarn local`. If AsciiDoc preview is enabled in your text editor, you can select links in the **Table of contents** or the **File** column to go directly to that section or file. For example:

**Output:**

![beautified-logs](https://github.com/kobiton/docs/assets/95643215/d2d7e7a1-2e07-417c-a6ec-f9971c31cdc1)

To generate standard Antora logs instead, run `yarn build`. For example:

**Output:**

![standard-logs](https://github.com/kobiton/docs/assets/95643215/6bcc992d-61c7-4005-9d56-e82c17b0b760)

## Antora playbooks and UI bundles

Typically, a project uses one `antora-playbook.yml` file and one `ui-bundle` directory to configure Antora, however, our project uses a set of each--one for [docs.kobiton.com](https://docs.kobiton.com/) and the other for [portal.kobiton.com](https://portal.kobiton.com/). In most cases, the playbook content will match and the UI bundles will be site-specific.

### Docs playbook and UI bundle

The content on [docs.kobiton.com](https://docs.kobiton.com/) is configured in the `antora-playbook-docs.yml` and the `ui-bundle-docs` directory.

**Output:**

![docs-site](https://github.com/kobiton/docs/assets/95643215/67c0dc03-5b3e-413c-bf01-41383c835a42)

- The `antora-playbook-docs.yml` file is used to configure the site name, analytics keys, extensions, UI bundle location, [Antora logs](#antora-logs), and [site URLs](#site-urls).
- The `ui-bundle-docs` directory contains all source files for style and design of the site, including the home page tiles. 

### Portal playbook and UI bundle

The help widget on [portal.kobiton.com](https://portal.kobiton.com/) configured in the `antora-playbook-widget.yml` file and the `ui-bundle-widget` directory.

**Output:**

<img src="https://github.com/kobiton/docs/assets/95643215/5a8c4c4f-b7de-4b0c-8638-f3d3df46e570" width="500" height="" />

- The `antora-playbook-widget.yml` file is used to configure the site name, analytics keys, extensions, and UI bundle location.
- The `ui-bundle-widget` directory contains all source files for style and design of the widget on [portal.kobiton.com](https://portal.kobiton.com/).

## Directory structure

Our project contains a single `modules` directory with an `antora.yml` file, a `ROOT` directory, and a modules directory for each Kobiton feature. For example:

```plaintext
PROJECT
└── docs
    ├── modules
    │   ├── ROOT
    │   ├── automation-testing
    │   └── manual-testing
    └── antora.yml
```

Each module in `modules` contains an `images`, `pages`, and `partials` directory, along with a `nav.adoc` file. For example:

```plaintext
PROJECT
└── docs
    ├── modules
    │   └── automation-testing
    │       ├── images
    │       ├── pages
    │       ├── partials
    │       └── nav.adoc
    └── antora.yml
```

_At a minimum_, each module's `pages` directory contains one `index.adoc` file, which represents the module's landing page in the [site navigation](#site-navigation). Each `pages` directory contains the documentation for each section (as an `.adoc` file) and can be organized into multi-nested subdirectories with or without their own landing pages. For example:

```plaintext
PROJECT
└── docs
    ├── modules
    │   └── automation-testing
    │       ├── images
    │       ├── pages
    │       │   ├── subsection-a
    │       │   │    ├── index.adoc
    │       │   │    └── page-a.adoc
    │       │   ├── subsection-b
    │       │   │    └── page-b.adoc
    │       │   ├── index.adoc
    │       │   └── page-c.adoc
    │       ├── partials
    │       └── nav.adoc
    └── antora.yml
```

[NOTE]
[Learn more about site navigation.](#site-navigation)

## Site navigation

When Antora builds content for [docs.kobiton.com](https://docs.kobiton.com), [the Antora playbook](#docs-playbook-and-ui-bundle) will reference the `antora.yml` file to determine which _modules_ to display in the navigation bar, and the `nav.adoc` files in each module to determine which _pages_ to display in the navigation bar.

### Configure navigation in `antora.yml`

The `antora.yml` file defines which modules are displayed in the navigation bar. This file should **only** be modified when an entire section needs to be added or removed from the navigation bar. For example:

**Input:**

```plaintext
name: ROOT
title: Kobiton Docs
version: ~
nav:
  - modules/get-started/nav.adoc
  - modules/release-notes/nav.adoc
  - modules/integrations/nav.adoc
  - modules/devices/nav.adoc
  - modules/apps/nav.adoc
  - modules/manual-testing/nav.adoc
  - modules/automation-testing/nav.adoc
  - modules/scriptless-automation/nav.adoc
  - modules/debugging/nav.adoc
  - modules/session-explorer/nav.adoc
  - modules/profile/nav.adoc
  - modules/organization/nav.adoc
  - modules/test-management/nav.adoc
  - modules/reporting/nav.adoc
  - modules/supported-platforms/nav.adoc
  - modules/api-reference/nav.adoc
```

**Output:**

![landing-page](https://github.com/kobiton/docs/assets/95643215/40513b33-61bd-43d6-910b-99c9f9e8dd05)

### Configure navigation in `nav.adoc`

The `nav.adoc` file within each module defines which pages are displayed in that module's section on the navigation bar. To ensure [site URLs](#url-configuration-in-navadoc) are generated properly, each `nav.adoc` files must begin with `.xref:index.adoc[]`. For example:

```plaintext
.xref:automation-testing:index.adoc[]
* xref:automation-testing:page-a.adoc[]
* xref:automation-testing:page-b.adoc[]
```

Additionally, each `nav.adoc` file can organize its module into multi-nested subsections--each subsection using a landing page or omitting one completely.

#### Create a subsection without a landing page

To create a subsection _without_ a landing page, first create the subsection directory and add all subsection content as `.adoc` files. For example:

```plaintext
automation-testing
├── pages
│   ├── subsection-a
│   │    ├── page-a1.adoc
│   │    └── page-a2.adoc
│   ├── index.adoc
│   └── page-b.adoc
└── nav.adoc
```

Then, add the subsection title to the `nav.adoc` file as plaintext, and all the subsection content one list-level below it. For example:

**Input:**

```plaintext
.xref:automation-testing:index.adoc[]

* Subsection A
** xref:automation-testing:subsection-a/page-a1.adoc[]
** xref:automation-testing:subsection-a/page-a2.adoc[]

* xref:automation-testing:page-b.adoc[]
```

**Output:**

![subsection-without-landing-page](https://github.com/kobiton/docs/assets/95643215/81619345-1949-47f6-baa5-d666b1cde6b2)

#### Create a subsection with a landing page

To create a subsection _with_ a landing page, first create the subsection directory. Add the landing page as an `index.adoc` file and the all subsection content as `.adoc` files. For example:

```plaintext
automation-testing
├── pages
│   ├── subsection-a
│   │    ├── index.adoc
│   │    └── page-a.adoc
│   ├── index.adoc
│   └── page-b.adoc
└── nav.adoc
```

Then, add the landing page to the `nav.adoc` file as an `xref`, and all the subsection's content one list-level below it. For example:

**Input:**

```plaintext
.xref:automation-testing:index.adoc[]

* xref:automation-testing:subsection-a/index.adoc[]
** xref:automation-testing:subsection-a/page-a.adoc[]

* xref:automation-testing:page-b.adoc[]
```

**Output:**

![subsection-with-landing-page](https://github.com/kobiton/docs/assets/95643215/22f52977-2f56-4dce-b472-647cbecc7f80)

## Site URLs

[NOTE]
These URL guidelines are strictly enforced to ensure URLs remain consistent, and bookmarks do not break for end-users.

The site URL is generated from the [`antora-playbook-docs.yml` file](#docs-playbook-and-ui-bundle), `antora.yml` file, and each module's [`nav.adoc` file](#configure-navigation-in-navadoc).

### URL configuration in  `antora-playbook-docs.yml`

The `antora-playbook-docs.yml` is used to add or remove the `.html` file extension from URL endings.

- File extension: `docs.kobiton.com/devices/install-an-app.html`
- No file extension: `docs.kobiton.com/devices/install-an-app`

For [docs.kobiton.com](https://docs.kobiton.com/), we **do not** add file extensions to URL endings, so the `html_extension_style` key is set to `drop` in the `antora-playbook-docs.yml` file. For example:

```yaml
site:
  title: Kobiton Docs

urls:
  html_extension_style: drop

content:
  sources:
  - url: .
    start_paths: docs
    branches: HEAD
```

However, if this needs to change in the future, [set `html_extension_style` to `indexing`](https://docs.antora.org/antora/latest/playbook/urls-html-extension-style/#html-extension-style-key) or remove the key completely. For example:

```yaml
site:
  title: Kobiton Docs

content:
  sources:
  - url: .
    start_paths: docs
    branches: HEAD
```

### URL configuration in  `antora.yml`

The `antora.yml` file in `PROJECT/docs/` is used to add or remove a subdirectory from the site URL. For example:

- Subdirectory: `docs.kobiton.com/docs/get-started/`
- No subdirectory: `docs.kobiton.com/get-started/`

For [docs.kobiton.com](https://docs.kobiton.com/), we **do not** add subdirectories, so the `name` property is set to `ROOT` in the `antora.yml` file. For example:

```yaml
name: ROOT
title: Kobiton Docs
version: ~
nav:
  - modules/get-started/nav.adoc
  - modules/release-notes/nav.adoc
  - modules/integrations/nav.adoc
```

However, if this needs to change in the future, set `name` to any hyphen-separated string. For example:

```yaml
name: kobiton-docs
title: Kobiton Docs
version: ~
nav:
  - modules/get-started/nav.adoc
  - modules/release-notes/nav.adoc
  - modules/integrations/nav.adoc
```

### URL configuration in  `nav.adoc`

The `nav.adoc` file in each module is used to generate the [site navigation](#configure-navigation-in-navadoc), as well as add or remove `index` from URLs. For example:

- Index: `docs.kobiton.com/get-started/index`
- No index: `docs.kobiton.com/get-started/`

For [docs.kobiton.com](https://docs.kobiton.com/), we **do not** add `index` to URLs, so [Antora's list title formatting](https://docs.antora.org/antora/latest/navigation/files-and-lists/#list-titles-and-items) should be applied to the first `index.adoc` listed in the `nav.adoc` file. For example:

```plaintext
.xref:index.adoc[]
* xref:devices:search-for-a-device.adoc[]
* xref:devices:manage-devices.adoc[]

* xref:devices:network-payload-capture/index.adoc[]
** xref:devices:network-payload-capture/configure-the-local-server.adoc[]
** xref:devices:network-payload-capture/configure-the-local-server.adoc[]
** xref:devices:network-payload-capture/configure-an-ios-device.adoc[]
```

## Hide a page from search

By default, all `.adoc` files in the `modules` directory are searchable on Kobiton Docs using the [Antora Lunr Extension](https://gitlab.com/antora/antora-lunr-extension). To hide a page from search results, add the `:noindex:` attribute to the page's metadata. For example:

```plaintext
= Generate an API token
:navtitle: Generate an API token
:noindex:

Learn how to generate an API token in Kobiton.
```

## Partials

Antora partials allow you to reuse content across the docs. _Global_ content (role requirements, pricing, etc.) is located within `ROOT/partials`, while _feature-specific_ content (supported app filetypes, supported gestures, etc.) is located within that specific feature's `partials` subdirectory. For example:

```plaintext
ROOT
└── docs
└── modules
├── ROOT
│   └── partials
│       ├── pricing.adoc
│       └── roles-page.adoc
└── apps
    └── partials
        └── supported-filetypes.adoc
```

To use a global partial, use the following `include` statement:

```plaintext
include::ROOT:partial$<filename>.adoc
```

To use a feature-specific partial, use the following `include` statement:

```plaintext
include::<feature>:partial$<filename>.adoc
```

## Directory and file names

All directories and files should follow these guidelines:

| Naming Guideline           | Before               | After                   |
|----------------------------|----------------------|-------------------------|
| Only lowercase letters     | `This Is My TITLE`   | `this is my title`      |
| Replace spaces with dashes | `this is my title`   | `this-is-my-title`      |
| Replace important symbols  | `i love c++ & c#`    | `i love cpp and csharp` |
| Remove unimportant symbols | `this: is my title!` | `this is my title`      | For example:

```plaintext
automation-testing
└──pages
    ├── desired-capabilities.adoc
    ├── download-appium-script.adoc
    ├── index.adoc
    └── supported-client-libraries.adoc
```

## Page types and templates

We use the [Diátaxis](https://diataxis.fr/) framework to structure our docs. Each Diátaxis category corresponds to one of these templates. Add a template to your `.adoc` file to get started.

### Tutorial page type

Tutorial docs walk users through their first time attempting a task. Everything a user needs should be available in the tutorial.

For example, a tutorial titled "Your first manual session" would state a learning objective, show the user how to start a session, offer an app for them to install, and walk them through a variety of test steps.

#### Tutorial template

```plaintext
= Title
:navtitle: Title

In this tutorial, we'll walk you through your first...

== Before you start

You'll need to download...

== Step 1

Content.

== Step 2

Content.

. Sub-step
. Sub-step
```

### How-to page type

How-to docs outline the steps for solving a specific problem. Unlike tutorials, How-tos only focus on a specific problem--not an entire process.

For example, a how-to doc titled "Download an app during a manual test session" would state the goal, give a line of context, and start step one assuming the user has _already_ launched a manual test session.

#### How-to template

```plaintext
= Title
:navtitle: Title

Learn how to...

== Step 1

Explain and give steps.

== Step 2

Explain steps.

. Give step
. Give step
```

### Reference page type

Reference docs describe a _product_, not a _process_. They're for users who know how to complete a process, but need more details about the _tools_ they use to complete a process.

For example, a reference doc titled "Desired capabilities" should list all desired capabilities along with their definition and a brief example. The reference doc shouldn't contain steps for modifying desired capabilities or walk users through their first automation session.

#### Reference template

```plaintext
= Title
:navtitle: Title

These are the ... for ...

== Category one

Item.

Definition.

Example.

== Category two

=== Item one

Definition.

Example.

=== Item two

Definition.

Example.
```

### Explanation page type

Explanation docs explore a topic, which could include its context within culture, its context within Kobiton, how it got here, and where it's headed.

For example, an explanation doc titled "About biometric authentication" should explore a few key milestones in its global development, why It's important to test, and how Kobiton can help.

#### Explanation template

```plaintext
= Title
:navtitle: Title

<Topic does x...>

== First item

Content.

== Second item

Content.
```

### Release notes

Release notes are not a part of the [Diátaxis](https://diataxis.fr/) framework, so we use the following templates for our release notes.

#### For Kobiton 4.0 or later

```plaintext
= Kobiton X.X release notes
:navtitle: Kobiton X.X release notes

_DATE_

== First item

Content.

== Second item

Content.
```

#### For legacy Kobiton
```plaintext
= Kobiton X.X release notes (Legacy)
:navtitle: Kobiton X.X release notes

_DATE_

== First item

Content.

== Second item

Content.
```

## Style and voice

One day we'll create our own, but for now we use the [Microsoft Style Guide](https://learn.microsoft.com/en-us/style-guide/brand-voice-above-all-simple-human) to inform our style and voice.

## Docker commands

We use [Docker](https://www.docker.com/) and [GitHub actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) to publish content to [docs.kobiton.com](https://docs.kobiton.com/) and [portal.kobiton.com](https://portal.kobiton.com/).

### Docker images for the docs

To create a docker image for [docs.kobiton.com](https://docs.kobiton.com/), run:

```shell
docker build -t kobiton/docs:1.0 -f docker/docs/Dockerfile .
```

### Docker images for the portal

To create a docker image for the help widget on [portal.kobiton.com](https://portal.kobiton.com/), run:

```shell
docker build -t kobiton/widget:1.0 -f docker/widget/Dockerfile .
```
