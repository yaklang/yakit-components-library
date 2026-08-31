#!/usr/bin/env node

import process from "node:process";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const repository = requiredEnvironment("RELEASE_REPOSITORY");
const tag = requiredEnvironment("RELEASE_TAG");
const commit = requiredEnvironment("RELEASE_COMMIT");
const packageName = requiredEnvironment("PACKAGE_NAME");
const packageVersion = requiredEnvironment("PACKAGE_VERSION");
const token = requiredEnvironment("GITHUB_TOKEN");
const supportedPackageNames = new Set([
  "yakit-ui",
  "@yakit-libs/yakit-ui",
  "@yakit-libs/yakit-ui-icons",
]);

if (!/^[0-9a-f]{40}$/i.test(commit))
  throw new Error("RELEASE_COMMIT must be a full Git commit SHA");
if (
  !supportedPackageNames.has(packageName) ||
  tag !== `${packageName}@${packageVersion}`
) {
  throw new Error("release tag does not match the package identity");
}

async function github(method, endpoint, body, accepted = [200, 201]) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}${endpoint}`,
    {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  if (!accepted.includes(response.status)) {
    throw new Error(
      `GitHub ${method} ${endpoint} failed with HTTP ${response.status}`,
    );
  }
  return response.status === 204 ? null : response.json();
}

async function resolveTarget(object) {
  let current = object;
  for (let depth = 0; depth < 5 && current.type === "tag"; depth += 1) {
    const tagObject = await github("GET", `/git/tags/${current.sha}`);
    current = tagObject.object;
  }
  if (current.type !== "commit" || !/^[0-9a-f]{40}$/i.test(current.sha ?? "")) {
    throw new Error("existing tag does not resolve to a Git commit");
  }
  return current.sha;
}

const encodedTag = encodeURIComponent(tag);
let existingRef;
try {
  existingRef = await github("GET", `/git/ref/tags/${encodedTag}`);
} catch (error) {
  if (!/HTTP 404$/.test(error.message)) throw error;
}
if (existingRef) {
  const target = await resolveTarget(existingRef.object);
  if (target !== commit)
    throw new Error(`tag ${tag} already points to a different commit`);
} else {
  await github("POST", "/git/refs", { ref: `refs/tags/${tag}`, sha: commit });
}

let release;
try {
  release = await github("GET", `/releases/tags/${encodedTag}`);
} catch (error) {
  if (!/HTTP 404$/.test(error.message)) throw error;
}
if (!release) {
  release = await github("POST", "/releases", {
    body: `Automated release for ${packageName}@${packageVersion}.`,
    draft: false,
    generate_release_notes: true,
    name: tag,
    prerelease: packageVersion.includes("-"),
    tag_name: tag,
    target_commitish: commit,
  });
} else if (release.tag_name !== tag) {
  throw new Error("existing GitHub release has conflicting tag metadata");
}

console.log(
  JSON.stringify(
    {
      releaseId: release.id,
      releaseUrl: release.html_url,
      tag,
      target: commit,
    },
    null,
    2,
  ),
);
