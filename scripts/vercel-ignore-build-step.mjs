#!/usr/bin/env node
/**
 * Vercel Ignored Build Step.
 *
 * Exit codes:
 *   1 -> build
 *   0 -> cancel / skip the build
 *
 * Production deploys always build. Preview deploys are skipped when any of
 * the required CI checks (typecheck, test, e2e) has concluded with a failure
 * state for the pushed commit. If checks are still in progress, the preview
 * builds right away (option A: skip-on-failure).
 */

const REQUIRED_CHECKS = ["typecheck", "test", "e2e"];
const FAILURE_CONCLUSIONS = ["failure", "timed_out", "cancelled", "action_required"];

const {
  VERCEL_ENV = "",
  VERCEL_GIT_COMMIT_SHA = "",
  VERCEL_GIT_REPO_SLUG = "",
  VERCEL_GIT_REPO_OWNER = "",
} = process.env;

function log(message) {
  console.log(`[vercel-ignore-build-step] ${message}`);
}

async function getCheckRuns(owner, repo, sha) {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "bcc007-portal" },
  });
  if (!response.ok) {
    throw new Error(`GitHub check-runs request failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.check_runs ?? [];
}

async function main() {
  // Always build production.
  if (VERCEL_ENV === "production") {
    log("production environment: building");
    process.exit(1);
  }

  if (!VERCEL_GIT_COMMIT_SHA || !VERCEL_GIT_REPO_SLUG || !VERCEL_GIT_REPO_OWNER) {
    log("missing git system env vars, building by default");
    process.exit(1);
  }

  try {
    const checkRuns = await getCheckRuns(VERCEL_GIT_REPO_OWNER, VERCEL_GIT_REPO_SLUG, VERCEL_GIT_COMMIT_SHA);

    for (const name of REQUIRED_CHECKS) {
      const runs = checkRuns.filter((run) => run.name === name);
      const failed = runs.some((run) => FAILURE_CONCLUSIONS.includes(run.conclusion));
      if (failed) {
        log(`required check "${name}" failed for ${VERCEL_GIT_COMMIT_SHA}: skipping build`);
        process.exit(0);
      }
    }

    log(`no required check failed for ${VERCEL_GIT_COMMIT_SHA}: building`);
    process.exit(1);
  } catch (error) {
    log(`error querying checks (${error.message}): building by default`);
    process.exit(1);
  }
}

main();
