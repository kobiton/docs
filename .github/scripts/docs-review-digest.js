#!/usr/bin/env node

const REQUIRED_ENV = ["GITHUB_TOKEN", "GITHUB_REPOSITORY"];

const READY_LABEL = process.env.READY_LABEL || "ready for review";
const REVIEWED_LABEL = process.env.REVIEWED_LABEL || "✅ REVIEWED ✅";
const CHANGES_NEEDED_LABEL = process.env.CHANGES_NEEDED_LABEL || "changes needed";
const REVIEW_ACTIVITY_WINDOW_HOURS = Number(process.env.REVIEW_ACTIVITY_WINDOW_HOURS || "48");

function requireEnv() {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      console.error(`Missing required env var: ${key}`);
      process.exit(1);
    }
  }
}

function daysBetween(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
}

function hoursBetween(startDate, endDate) {
  const msPerHour = 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerHour);
}

function hasLabel(pr, labelName) {
  return pr.labels.nodes.some((label) => label.name === labelName);
}

function latestReviewDate(pr) {
  const reviewDates = pr.reviews.nodes.map((review) => new Date(review.submittedAt));
  const commentDates = pr.reviewThreads.nodes.flatMap((thread) =>
    thread.comments.nodes.map((comment) => new Date(comment.createdAt))
  );

  const allDates = [...reviewDates, ...commentDates].filter((date) => !Number.isNaN(date.getTime()));

  if (allDates.length === 0) {
    return null;
  }

  return new Date(Math.max(...allDates.map((date) => date.getTime())));
}

function hasApproval(pr) {
  return pr.reviews.nodes.some((review) => review.state === "APPROVED");
}

function bucketForAge(daysReady) {
  if (daysReady >= 14) {
    return "very_stale";
  }

  if (daysReady >= 7) {
    return "stale";
  }

  if (daysReady >= 5) {
    return "needs_attention";
  }

  if (daysReady >= 3) {
    return "coming_up";
  }

  return null;
}

async function githubGraphql(query, variables) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "docs-review-digest"
    },
    body: JSON.stringify({ query, variables })
  });

  const body = await response.json();

  if (!response.ok || body.errors) {
    throw new Error(`GitHub GraphQL query failed: ${JSON.stringify(body, null, 2)}`);
  }

  return body.data;
}

async function fetchOpenPullRequests(owner, repo) {
  const query = `
    query($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequests(
          states: OPEN
          first: 50
          after: $cursor
          orderBy: { field: CREATED_AT, direction: DESC }
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            number
            title
            url
            author {
              login
            }
            createdAt
            isDraft
            labels(first: 20) {
              nodes {
                name
              }
            }
            reviewRequests(first: 20) {
              nodes {
                requestedReviewer {
                  ... on User {
                    login
                  }
                  ... on Team {
                    name
                  }
                }
              }
            }
            reviews(first: 50, states: [APPROVED, CHANGES_REQUESTED, COMMENTED], author: null) {
              nodes {
                state
                submittedAt
                author {
                  login
                }
              }
            }
            reviewThreads(first: 50) {
              nodes {
                comments(first: 20) {
                  nodes {
                    createdAt
                    author {
                      login
                    }
                  }
                }
              }
            }
            timelineItems(first: 100, itemTypes: [LABELED_EVENT]) {
              nodes {
                ... on LabeledEvent {
                  createdAt
                  label {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const prs = [];
  let cursor = null;

  do {
    const data = await githubGraphql(query, { owner, repo, cursor });
    const page = data.repository.pullRequests;

    prs.push(...page.nodes);

    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  return prs;
}

function getReadyForReviewDate(pr) {
  const readyLabelEvents = pr.timelineItems.nodes
    .filter((item) => item.label?.name === READY_LABEL)
    .map((item) => new Date(item.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (readyLabelEvents.length === 0) {
    return new Date(pr.createdAt);
  }

  return new Date(Math.max(...readyLabelEvents.map((date) => date.getTime())));
}

function mapReviewerNames(pr) {
  const reviewers = pr.reviewRequests.nodes
    .map((request) => request.requestedReviewer?.login || request.requestedReviewer?.name)
    .filter(Boolean);

  return reviewers.length > 0 ? reviewers : ["Unassigned"];
}

function buildDigest(prs) {
  const now = new Date();

  const digest = {
    source: "github",
    repository: process.env.GITHUB_REPOSITORY,
    queried_at: now.toISOString(),
    criteria: {
      ready_label: READY_LABEL,
      reviewed_label: REVIEWED_LABEL,
      changes_needed_label: CHANGES_NEEDED_LABEL,
      review_activity_window_hours: REVIEW_ACTIVITY_WINDOW_HOURS
    },
    total_count: 0,
    buckets: {
      coming_up: [],
      needs_attention: [],
      stale: [],
      very_stale: []
    }
  };

  for (const pr of prs) {
    if (pr.isDraft) {
      continue;
    }

    if (!hasLabel(pr, READY_LABEL)) {
      continue;
    }

    if (hasLabel(pr, REVIEWED_LABEL)) {
      continue;
    }

    if (hasApproval(pr)) {
      continue;
    }

    const latestReview = latestReviewDate(pr);
    if (latestReview) {
      const hoursSinceReview = hoursBetween(latestReview, now);

      if (hoursSinceReview < REVIEW_ACTIVITY_WINDOW_HOURS) {
        continue;
      }
    }

    const readyForReviewAt = getReadyForReviewDate(pr);
    const daysReady = daysBetween(readyForReviewAt, now);
    const bucket = bucketForAge(daysReady);

    if (!bucket) {
      continue;
    }

    const item = {
      number: pr.number,
      title: pr.title,
      url: pr.url,
      author: pr.author?.login || "unknown",
      reviewers: mapReviewerNames(pr),
      ready_for_review_at: readyForReviewAt.toISOString(),
      days_ready: daysReady,
      latest_review_activity_at: latestReview ? latestReview.toISOString() : null,
      labels: pr.labels.nodes.map((label) => label.name)
    };

    digest.buckets[bucket].push(item);
    digest.total_count += 1;
  }

  return digest;
}

async function main() {
  requireEnv();

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${process.env.GITHUB_REPOSITORY}`);
  }

  const prs = await fetchOpenPullRequests(owner, repo);
  const digest = buildDigest(prs);

  console.log(JSON.stringify(digest, null, 2));
}

main().catch((error) => {
  console.error("Failed to build docs review digest.");
  console.error(error);
  process.exit(1);
});