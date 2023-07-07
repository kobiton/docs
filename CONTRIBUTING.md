# Kobiton Docs contributors guide

Thanks for contributing to Kobiton Docs!
This guide covers how content for [docs.kobiton.com](https://docs.kobiton.com/) is created, organized, and published. Everyone here is expected to adhere to the [Code of Conduct](CODE_OF_CONDUCT.md) so be sure to review before contributing.

If you're new to docs-as-code, start with [First time contributors](#first-time-contributors), otherwise choose a topic below:

## Table of contents

- [First time contributors](#first-time-contributors)
- [Build the docs locally](#build-the-docs-locally)
- [Directory structure](#directory-structure)
- [Antora playbooks](#antora-playbooks)
- [Site navigation](#site-navigation)
- [Partials](#partials)
- [File naming](#file-naming)
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
- [File naming](#file-naming)
- [Directory structure](#directory-structure)

### Static site generator

The static site generator converts all plain text files to HTML and bundles them with our CSS when you [build the docs locally](#build-the-docs-locally).

- [Learn about Antora](https://docs.antora.org/antora/latest/how-antora-works/)
- [Get started with Antora](https://docs.antora.org/antora/latest/install-and-run-quickstart/)
- [Antora playbooks](#antora-playbooks)

### Publishing

When a commit is merged to our `main` branch in GitHub, the site is automatically published using Docker and GitHub actions.

- [Learn about Docker](https://docs.docker.com/get-started/overview/)
- [Get started with Docker](https://docs.docker.com/get-started/)
- [Docker commands](#docker-commands)
- [Learn about GitHub actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions)
- [Get started with GitHub actions](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow)

## Build the docs locally

We use [Antora](https://docs.antora.org/antora/latest/how-antora-works/) to generate a static site. Before you can use Antora to generate the site locally, you'll need [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/). Run the following commands to see if they're installed:

```shell
node --version
yarn --version
```

If Node.js and Yarn are installed, install our project dependencies and build the docs locally by running:

```shell
yarn install
yarn build
```

## Directory structure

We use one `modules` directory containing an `antora.yml` file, a `ROOT` directory, and a directory for each Kobiton feature. Each directory in `modules` contains an `images`, `pages`, and `partials` directories, along with a `nav.adoc` file.

For example:

```plaintext
kobiton-docs
└── docs
└── modules
├── ROOT
│   ├── images
│   ├── pages
│   │   └── index.adoc
│   ├── partials
│   └── nav.adoc
├── automation-testing
│   ├── images
│   ├── pages
│   │   └── index.adoc
│   ├── partials
│   └── nav.adoc
├── manual-testing
│   ├── images
│   ├── pages
│   │   ├── index.adoc
│   │   └── other-page.adoc
│   ├── partials
│   └── nav.adoc
└── antora.yml
```

## Antora playbooks

Typically, Antora is configured using one `antora-playbook.yml` file, however, Kobiton Docs uses two:

- `antora-playbook-docs.yml`
- `antora-playbook-widget.yml`

The first playbook is used to configure [docs.kobiton.com](https://docs.kobiton.com/), while the second is used to configure the help widget on [portal.kobiton.com](https://portal.kobiton.com/). Additionally, each playbook uses their own UI bundle for CSS styling:

- `ui-bundle-docs`
- `ui-bundle-widget`

In most cases, each Kobiton Docs playbook should match and the UI bundles should be unique.

## Site navigation

Each subdirectory in `modules` contains a dedicated `nav.adoc` file. When Antora builds the docs, `modules/antora.yml` will reference each `nav.adoc` and create the site navigation.

For example, this `antora.yml` will create the site navigation by referencing `automation-testing/nav.adoc` and `manual-testing/nav.adoc`:

```plaintext
kobiton-docs
└── docs
└── modules
├── automation-testing
│   └── nav.adoc
├── manual-testing
│   └── nav.adoc
└── antora.yml
```

To configure the site navigation, open a subdirectory in `modules` and edit the related `nav.adoc` file.

For example:

```asciidoc
* xref:index.adoc[]
** desired-capabilities
*** xref:auto-generate-desired-capabilities.adoc[]
*** xref:list-of-desired-capabilities.adoc[]
** xref:download-appium-script.adoc[]
** xref:supported-client-libraries.adoc[]
```

## Partials

You can use partials to reuse content across the docs. _Global_ content (role requirements, pricing, etc.) is located within the `partials` directory in `ROOT`, while _feature-specific_ content (supported app filetypes, supported gestures, etc.) is located within the `partials` directory for that specific feature.

For example:

```plaintext
kobiton-docs
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

To reference a global partial, use the following `include` statement:

```asciidoc
include::ROOT:partial$<filename>.adoc
```

To reference a feature-specific partial, use the following `include` statement:

```asciidoc
include::<feature>:partial$<filename>.adoc
```

## File naming

We use these naming guidelines for all files in Kobiton Docs:

| Naming Guideline           | Before               | After                   |
|----------------------------|----------------------|-------------------------|
| Only lowercase letters     | `This Is My TITLE`   | `this is my title`      |
| Replace spaces with dashes | `this is my title`   | `this-is-my-title`      |
| Replace important symbols  | `i love c++ & c#`    | `i love cpp and csharp` |
| Remove unimportant symbols | `this: is my title!` | `this is my title`      |

For example:

```plaintext
automation-testing
└──pages
├── desired-capabilities.adoc
├── download-appium-script.adoc
├── index.adoc
└── supported-client-libraries.adoc
```
# Page types and templates

We use the [Diátaxis](https://diataxis.fr/) framework to structure our docs. Each Diátaxis category corresponds to one of these templates. Add a template to your `.adoc` file to get started.

## Tutorial page type

Tutorial docs walk users through their first time attempting a task. Everything a user needs should be available in the tutorial.

For example, a tutorial titled "Your first manual session" would state a learning objective, show the user how to start a session, offer an app for them to install, and walk them through a variety of test steps.

### Tutorial template

```asciidoc
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

## How-to page type

How-to docs outline the steps for solving a specific problem. Unlike tutorials, How-tos only focus on a specific problem--not an entire process.

For example, a how-to doc titled "Download an app during a manual test session" would state the goal, give a line of context, and start step one assuming the user has _already_ launched a manual test session.

### How-to template

```asciidoc
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

## Reference page type

Reference docs describe a _product_, not a _process_. They're for users who know how to complete a process, but need more details about the _tools_ they use to complete a process.

For example, a reference doc titled "Desired capabilities" should list all desired capabilities along with their definition and a brief example. The reference doc shouldn't contain steps for modifying desired capabilities or walk users through their first automation session.

### Reference template

```asciidoc
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

## Explanation page type

Explanation docs explore a topic, which could include its context within culture, its context within Kobiton, how it got here, and where it's headed.

For example, an explanation doc titled "About biometric authentication" should explore a few key milestones in its global development, why It's important to test, and how Kobiton can help.

### Explanation template

```asciidoc
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

```asciidoc
= Kobiton X.X release notes
:navtitle: Kobiton X.X release notes

_DATE_

== First item

Content.

== Second item

Content.
```

#### For legacy Kobiton
```asciidoc
= Kobiton X.X release notes (Legacy)
:navtitle: Kobiton X.X release notes

_DATE_

== First item

Content.

== Second item

Content.
```

# Style and voice

One day we'll create our own, but for now we use the [Microsoft Style Guide](https://learn.microsoft.com/en-us/style-guide/brand-voice-above-all-simple-human) to inform our style and voice.

# Docker commands

We use [Docker](https://www.docker.com/) and [GitHub actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) to publish content to [docs.kobiton.com](https://docs.kobiton.com/) and the help widget on [portal.kobiton.com](https://portal.kobiton.com/).

## `docs`

Images for [docs.kobiton.com](https://docs.kobiton.com/) are built using the following Docker command:

```shell
docker build -t kobiton/docs:1.0 -f docker/docs/Dockerfile .
```

## `widget`

Images for the help widget on [portal.kobiton.com](https://portal.kobiton.com/) are built using the following Docker command:

```shell
docker build -t kobiton/widget:1.0 -f docker/widget/Dockerfile .
```
