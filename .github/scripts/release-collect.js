#!/usr/bin/env node

const REQUIRED_ENV = ["GITHUB_TOKEN", "GITHUB_REPOSITORY"];

const PARTIALS_PATH = process.env.PARTIALS_PATH || "docs/modules/release-notes/partials/";
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || "14");
const INCLUDE_OPEN = (process.env.INCLUDE_OPEN || "true") === "true";
const INCLUDE_MERGED = (process.env.INCLUDE_MERGED || "true") === "true";
const INCLUDE_SKIPPED = (process.env.INCLUDE_SKIPPED || "false") === "true";

function requireEnv() {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      console.error(`Missing required env var: ${key}`);
      process.exit(1);
    }
  }
}

function parseRepository(value) {
  const [owner, repo] = value.split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${value}`);
  }

  return { owner, repo };
}

function getSinceDate() {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);
  return since;
}

function isWithinLookback(pr, sinceDate) {
  const updatedAt = new Date(pr.updated_at);

  if (Number.isNaN(updatedAt.getTime())) {
    return false;
  }

  return updatedAt >= sinceDate;
}

function isCandidateState(pr) {
  if (INCLUDE_OPEN && pr.state === "open") {
    return true;
  }

  if (INCLUDE_MERGED && pr.state === "closed" && pr.merged_at) {
    return true;
  }

  return false;
}

function extractTicketKey(text) {
  const match = text.match(/\bKOB-\d+\b/i);
  return match ? match[0].toUpperCase() : null;
}

async function githubFetch(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "the-gazette-release-collector"
    }
  });

  const bodyText = await response.text();

  let body;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${response.statusText}\n${JSON.stringify(body, null, 2)}`);
  }

  return body;
}

async function fetchPullRequests(owner, repo) {
  const all = [];
  let page = 1;

  while (true) {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`);
    url.searchParams.set("state", "all");
    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const prs = await githubFetch(url.toString());

    if (!Array.isArray(prs) || prs.length === 0) {
      break;
    }

    all.push(...prs);

    if (prs.length < 100) {
      break;
    }

    page += 1;
  }

  return all;
}

async function fetchPullRequestFiles(owner, repo, pullNumber) {
  const all = [];
  let page = 1;

  while (true) {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const files = await githubFetch(url.toString());

    if (!Array.isArray(files) || files.length === 0) {
      break;
    }

    all.push(...files);

    if (files.length < 100) {
      break;
    }

    page += 1;
  }

  return all;
}

async function fetchFileContentAtRef(owner, repo, filePath, ref) {
  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`);
  url.searchParams.set("ref", ref);

  const file = await githubFetch(url.toString());

  if (!file || file.type !== "file" || !file.content) {
    throw new Error(`Unable to read file content for ${filePath} at ${ref}`);
  }

  return Buffer.from(file.content, "base64").toString("utf8");
}

function buildPrMetadata(pr) {
  return {
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    state: pr.state,
    merged_at: pr.merged_at,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    head_ref: pr.head?.ref || null,
    head_sha: pr.head?.sha || null,
    base_ref: pr.base?.ref || null,
    author: pr.user?.login || "unknown",
    labels: Array.isArray(pr.labels) ? pr.labels.map((label) => label.name) : []
  };
}

async function collectSources(owner, repo) {
  const sinceDate = getSinceDate();
  const prs = await fetchPullRequests(owner, repo);

  const output = {
    source: "github",
    workflow: "the-gazette",
    repository: `${owner}/${repo}`,
    queried_at: new Date().toISOString(),
    lookback_days: LOOKBACK_DAYS,
    since: sinceDate.toISOString(),
    criteria: {
      partials_path: PARTIALS_PATH,
      include_open: INCLUDE_OPEN,
      include_merged: INCLUDE_MERGED,
      primary_signal: `changed files under ${PARTIALS_PATH}`
    },
    candidate_pr_count: 0,
    partial_count: 0,
    ignored_non_partial_file_count: 0,
    sources: [],
    skipped: [],
    needs_editor_review: []
  };

  for (const pr of prs) {
    if (!isWithinLookback(pr, sinceDate)) {
      continue;
    }

    if (!isCandidateState(pr)) {
      continue;
    }

    const files = await fetchPullRequestFiles(owner, repo, pr.number);
    const partialFiles = files.filter((file) => file.filename.startsWith(PARTIALS_PATH));
    const ignoredFiles = files.filter((file) => !file.filename.startsWith(PARTIALS_PATH));

    if (partialFiles.length === 0) {
      const isPotentialReleaseNoteCandidate =
        pr.user?.login === "IT-Kobiton" &&
        files.some((file) =>
            file.filename.startsWith("docs/modules/")
        );

      if (isPotentialReleaseNoteCandidate) {
          output.needs_editor_review.push({
            pr_number: pr.number,
            pr_title: pr.title,
            pr_url: pr.html_url,
            reason:
              "IT-Kobiton docs PR without a release-note partial. Changed customer-facing docs surface. Human review recommended.",
            signal: [
              "author: IT-Kobiton",
              "changed_path: docs/modules/"
            ],
            changed_files: files.map((file) => file.filename)
          });
        }

          output.skipped.push({
            pr_number: pr.number,
            pr_title: pr.title,
            pr_url: pr.html_url,
            reason: "No release-note partial files changed",
            changed_file_count: files.length
          });

      continue;
    }

    output.candidate_pr_count += 1;
    output.ignored_non_partial_file_count += ignoredFiles.length;

    for (const file of partialFiles) {
      let content = "";
      let contentError = null;

      try {
        content = await fetchFileContentAtRef(owner, repo, file.filename, pr.head.sha);
      } catch (error) {
        contentError = error.message;
      }

      const ticketKey = extractTicketKey(file.filename) || extractTicketKey(pr.title) || extractTicketKey(content);

      output.sources.push({
        ticket_key: ticketKey,
        file_path: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        content,
        content_error: contentError,
        pr: buildPrMetadata(pr),
        ignored_non_partial_files: ignoredFiles.map((ignored) => ({
          file_path: ignored.filename,
          status: ignored.status
        }))
      });

      output.partial_count += 1;
    }
  }

  return output;
}

async function main() {
  requireEnv();

  if (!INCLUDE_OPEN && !INCLUDE_MERGED) {
    throw new Error("At least one of INCLUDE_OPEN or INCLUDE_MERGED must be true.");
  }

  if (!Number.isFinite(LOOKBACK_DAYS) || LOOKBACK_DAYS < 1) {
    throw new Error(`LOOKBACK_DAYS must be a positive number. Received: ${process.env.LOOKBACK_DAYS}`);
  }

  const { owner, repo } = parseRepository(process.env.GITHUB_REPOSITORY);
  const output = await collectSources(owner, repo);

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error("Failed to collect release-note draft partials.");
  console.error(error);
  process.exit(1);
});