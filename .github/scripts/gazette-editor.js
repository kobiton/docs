#!/usr/bin/env node

const fs = require("fs");

const releaseFilePath = process.env.RELEASE_FILE_PATH;
const publicationDate = process.env.PUBLICATION_DATE;
const navFile = process.env.NAV_FILE;
const latestFile = process.env.LATEST_FILE;

function requireValue(name, value) {
  if (!value) {
    console.error(`Missing ${name}.`);
    process.exit(1);
  }
}

function formatPublicationDate(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) {
    console.error(
      `Invalid PUBLICATION_DATE "${dateString}". Expected YYYY-MM-DD.`
    );
    process.exit(1);
  }

  const [, year, month, day] = match;

  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day)
    )
  );

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function ensureFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`${description} does not exist: ${filePath}`);
    process.exit(1);
  }
}

requireValue("RELEASE_FILE_PATH", releaseFilePath);
requireValue("PUBLICATION_DATE", publicationDate);
requireValue("NAV_FILE", navFile);
requireValue("LATEST_FILE", latestFile);

ensureFileExists(releaseFilePath, "Gazette release file");
ensureFileExists(navFile, "Release notes nav file");
ensureFileExists(latestFile, "Latest release file");

const visibleDate = formatPublicationDate(publicationDate);

const title = `= Kobiton Cloud ${visibleDate} release notes`;

const preamble = [
  "[NOTE]",
  "====",
  "Cloud release notes are typically published weekly and summarize changes since the previous publication. Kobiton uses date-based release versioning, with releases identified by the build date in YYMM.DD format. Version information for individual software components is available in the Component versions section.",
  "====",
].join("\n");

function buildComponentVersionsSection(componentVersions) {
  if (!componentVersions || componentVersions.length === 0) {
    return [
      "== Component versions",
      "",
      "// Editor review required: component versions not yet verified.",
    ].join("\n");
  }

  return [
    "== Component versions",
    "",
    ...componentVersions.map(
      ({ name, version }) => `- ${name} ${version}`
    ),
  ].join("\n");
}

const componentVersionsSection = buildComponentVersionsSection([]);

//
// Prepare release page
//

let releaseContent = fs.readFileSync(releaseFilePath, "utf8");

// Remove Gazette's temporary title/date header.
releaseContent = releaseContent.replace(
  /^= Release Notes\s*\n+(?:_[^_\n]+_\s*\n+)?/,
  ""
);

// Remove leading whitespace left by the draft header.
releaseContent = releaseContent.replace(/^\s+/, "");

const finalReleaseContent = [
  title,
  "",
  preamble,
  "",
  componentVersionsSection,
  "",
  releaseContent.trimEnd(),
  "",
].join("\n");

fs.writeFileSync(releaseFilePath, finalReleaseContent);

console.log(`Updated release page: ${releaseFilePath}`);
console.log(`Visible title: ${title}`);

//
// Update release-note navigation
//

const navEntry = `** xref:all-releases/${publicationDate}.adoc[]`;

let navContent = fs.readFileSync(navFile, "utf8");

if (navContent.includes(navEntry)) {
  console.log("Nav entry already exists. No nav change needed.");
} else {
  const lines = navContent.split("\n");

  const firstReleaseIndex = lines.findIndex((line) =>
    line.startsWith("** xref:all-releases/")
  );

  if (firstReleaseIndex === -1) {
    console.error(
      "Could not find an existing all-releases nav entry. Refusing to guess where the new entry belongs."
    );
    process.exit(1);
  }

  lines.splice(firstReleaseIndex, 0, navEntry);

  navContent = lines.join("\n").replace(/\n*$/, "\n");

  fs.writeFileSync(navFile, navContent);

  console.log(`Added nav entry: ${navEntry}`);
}

//
// Update latest release include
//

const latestContent =
  `include::all-releases/${publicationDate}.adoc[leveloffset=1]\n`;

fs.writeFileSync(latestFile, latestContent);

console.log(`Updated latest release file: ${latestFile}`);

//
// Final checklist
//

console.log("");
console.log("Gazette Editor checklist");
console.log("------------------------");
console.log(`[x] Release page prepared: ${releaseFilePath}`);
console.log(`[x] Publication date confirmed: ${publicationDate}`);
console.log(`[x] Visible title updated`);
console.log(`[x] Title includes Cloud`);
console.log(`[x] Preamble applied`);
console.log(`[x] Nav updated or already current`);
console.log(`[x] Latest release reference updated`);
console.log("[ ] Component versions verified");
console.log("[ ] Duplicate entries checked");
console.log("[ ] Technical wording reviewed");
console.log("[ ] H2/H3 structure reviewed");
console.log("[ ] Entry significance/order reviewed");