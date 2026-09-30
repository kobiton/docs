#!/usr/bin/env node

const fs = require("fs");

const inputFile = process.env.DIGEST_FILE;
const outputFile = process.env.SLACK_MESSAGE_FILE;

if (!inputFile) {
  console.error("Missing DIGEST_FILE.");
  process.exit(1);
}

if (!outputFile) {
  console.error("Missing SLACK_MESSAGE_FILE.");
  process.exit(1);
}

const digest = JSON.parse(fs.readFileSync(inputFile, "utf8"));

const bucketLabels = [
  ["needs_attention", "Needs attention, 5-6 days"],
  ["stale", "Stale, 7-13 days"],
  ["very_stale", "Very stale, 14+ days"],
  ["coming_up", "Coming up, 3-4 days"],
];

function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function formatReviewers(reviewers) {
  if (!reviewers || reviewers.length === 0) {
    return "No requested reviewers";
  }

  return reviewers.join(", ");
}

function formatPr(pr) {
  const latestActivity = pr.latest_review_activity_at
    ? `Latest review activity: ${pr.latest_review_activity_at}`
    : "No recorded review activity";

  return [
    `• <${pr.url}|#${pr.number} ${pr.title}>`,
    `  Author: ${pr.author}`,
    `  Reviewers: ${formatReviewers(pr.reviewers)}`,
    `  Ready for review: ${pr.days_ready} ${pluralize(pr.days_ready, "day")}`,
    `  ${latestActivity}`,
  ].join("\n");
}

const lines = [];

lines.push("🔔 *Dinner Bell: Docs PRs waiting for review*");
lines.push("");
lines.push(
  "These PRs are labeled `ready for review` and do not appear to have approval or recent review activity."
);
lines.push("");
lines.push(
  "Please review, approve, or comment with blockers. If these PRs should not move forward, please say so in the PR so docs can close the loop."
);
lines.push("");
lines.push(`Total waiting: ${digest.total_count}`);

for (const [bucketKey, bucketTitle] of bucketLabels) {
  const prs = digest.buckets[bucketKey] || [];

  if (prs.length === 0) {
    continue;
  }

  lines.push("");
  lines.push(`*${bucketTitle}*`);
  lines.push("");

  for (const pr of prs) {
    lines.push(formatPr(pr));
    lines.push("");
  }
}

if (digest.total_count === 0) {
  lines.push("");
  lines.push("No docs PRs need review right now.");
}

fs.writeFileSync(outputFile, `${lines.join("\n").trim()}\n`);
console.log(`Wrote Slack message to ${outputFile}`);