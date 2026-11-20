import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkedFile, documentationPlan } from "./storybook-release.mjs";

async function github(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      ...options.headers,
    },
  });
  if (!response.ok)
    throw new Error(
      `GitHub ${options.method ?? "GET"} ${new URL(url).pathname}: HTTP ${response.status}`,
    );
  return response.status === 204 ? undefined : response.json();
}

export async function attachDocumentation(directory, manifest, repository) {
  const { pair, tags, filename } = documentationPlan(manifest);
  if (filename !== manifest.offlineStorybook.filename)
    throw new Error("Documentation version mismatch");
  const digest = manifest.offlineStorybook.sha256;
  const file = await checkedFile(directory, filename, digest);
  for (const item of pair) {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(item.name)}/${item.version}`,
    );
    if (
      !response.ok ||
      (await response.json()).dist?.integrity !== item.integrity
    )
      throw new Error(
        `Published bytes not confirmed for ${item.name}@${item.version}`,
      );
  }
  const api = `https://api.github.com/repos/${repository}/releases`;
  const releases = await Promise.all(
    tags.map((tag) => github(`${api}/tags/${encodeURIComponent(tag)}`)),
  );
  const [owner, secondary] = releases;
  let asset = owner.assets.find((item) => item.name === filename);
  // GitHub can retain an empty starter asset after a failed upload.
  if (asset?.state === "starter" && asset.size === 0) {
    await github(`${api}/assets/${asset.id}`, { method: "DELETE" });
    asset = undefined;
  }
  if (!asset) {
    const upload = new URL(owner.upload_url.split("{")[0]);
    upload.searchParams.set("name", filename);
    asset = await github(upload, {
      method: "POST",
      headers: { "content-type": "application/zip" },
      body: await readFile(file),
    });
  }
  if (asset.state !== "uploaded" || asset.digest !== "sha256:" + digest)
    throw new Error(
      `Existing release asset differs from verified ZIP: ${filename}`,
    );
  if (
    secondary &&
    !(secondary.body ?? "").includes(asset.browser_download_url)
  ) {
    const body =
      (secondary.body ?? "").trimEnd() +
      `\n\n[下载离线 Storybook（UI + Icons）](${asset.browser_download_url})\n`;
    await github(`${api}/${secondary.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
  }
  return asset.browser_download_url;
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  const directory = path.resolve(process.argv[2] ?? ".release/verified");
  const manifest = JSON.parse(
    await readFile(path.join(directory, "verification-manifest.json"), "utf8"),
  );
  const repository = process.env.GITHUB_REPOSITORY;
  if (
    !repository ||
    manifest.repository !== repository ||
    String(manifest.runId) !== process.env.SOURCE_RUN_ID
  )
    throw new Error("Documentation evidence repository or source run mismatch");
  if (!manifest.offlineStorybook) {
    // Recovery can also target immutable evidence created before this migration.
    if (process.env.LEGACY_RECOVERY !== "true")
      throw new Error("Missing verified documentation ZIP");
    console.log(
      "This historical verification artifact predates offline documentation.",
    );
  } else {
    console.log(await attachDocumentation(directory, manifest, repository));
  }
}
