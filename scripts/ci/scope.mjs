import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const empty = () => ({
  icons: false,
  icon_build: false,
  ui: false,
  integration: false,
  storybook: false,
  release_tools: false,
  isolation: false,
  platforms: false,
});
export function classify(paths) {
  const flags = empty();
  const all = () =>
    Object.keys(flags).forEach((key) => {
      flags[key] = true;
    });
  for (const raw of paths) {
    const file = raw.replaceAll("\\", "/");
    if (
      file === "AGENTS.md" ||
      file.startsWith(".agents/skills/sync-icon-sources/")
    ) {
      flags.icons = true;
      continue;
    }
    if (
      /\.md$/.test(file) &&
      !file.startsWith(".changeset/") &&
      !file.includes("/src/") &&
      !file.includes("/.storybook/")
    )
      continue;
    // Release contracts also inspect package manifests and type-test configuration.
    if (
      /^packages\/yakit-ui(?:-icons)?\/(?:package\.json$|tsconfig[^/]*\.json$|test\/types\/)/.test(
        file,
      )
    )
      flags.release_tools = true;
    if (
      file.startsWith("packages/yakit-ui-icons/") ||
      file.startsWith("scripts/icons/") ||
      file.startsWith("test/icons/")
    ) {
      flags.icons = flags.integration = true;
      const artwork =
        file === "packages/yakit-ui-icons/catalog/index.html" ||
        /^packages\/yakit-ui-icons\/(?:src\/.*\.svg|config\/icon-sources\/(?:[^/]+\.json|svg\/[^/]+\/[^/]+\.svg|evidence\/[^/]+\/[^/]+\.json)|src\/(?:outline|solid|colorful|oldicon)\/index\.tsx|src\/colorful\/catalog\.ts|src\/figmaNameCatalog\.ts|config\/iconStrokeContract\.generated\.ts)$/.test(
          file,
        );
      if (!artwork) {
        flags.platforms = true;
        if (!file.includes("/test/") && !file.startsWith("test/"))
          flags.ui = flags.storybook = true;
      }
      if (
        /^(?:scripts\/icons\/verify-isolation\.mjs|packages\/yakit-ui-icons\/(?:package\.json|vite\.config\.ts|tsconfig.*|config\/|scripts\/|src\/index\.tsx))/.test(
          file,
        ) &&
        !artwork
      )
        flags.isolation = true;
    } else if (file.startsWith("packages/yakit-ui/")) {
      flags.ui = flags.integration = flags.storybook = true;
      if (file.includes("/scripts/release/") || file.includes("/test/release/"))
        flags.release_tools = true;
    } else if (
      file.startsWith("scripts/release/") ||
      file.startsWith("test/release/") ||
      file.startsWith(".changeset/") ||
      file.startsWith("test/auto-import/")
    ) {
      flags.release_tools = flags.integration = flags.storybook = true;
    } else all(); // Unknown inputs cannot silently skip checks.
  }
  flags.icon_build = flags.icons || flags.ui || flags.integration;
  return flags;
}
export function changedPaths(
  base,
  head = "HEAD",
  { pullRequest = false, git = execFileSync } = {},
) {
  if (!base || /^0+$/.test(base)) return null;
  try {
    if (pullRequest)
      base = git("git", ["merge-base", base, head], {
        encoding: "utf8",
      }).trim();
    return git(
      "git",
      ["diff", "--name-only", "--no-renames", "-z", base, head],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean);
  } catch {
    return null;
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const files = changedPaths(process.env.CI_BASE, process.env.CI_HEAD, {
    pullRequest: process.env.CI_EVENT === "pull_request",
  });
  const result = classify(files ?? ["unknown-input"]);
  console.log(JSON.stringify({ files, checks: result }, null, 2));
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(result)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(""),
    );
}
