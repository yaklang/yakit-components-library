import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { attachDocumentation } from "../../scripts/release/attach-storybook-zip.mjs";
import {
  documentationPlan,
  UI,
  ICONS,
} from "../../scripts/release/storybook-release.mjs";

for (const batch of [[UI], [ICONS], [UI, ICONS]]) {
  test(`deliver the verified version pair for ${batch.join(" + ")} exactly once`, async (t) => {
    const folder = await mkdtemp(path.join(tmpdir(), "storybook-assets-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const packages = [
      { name: UI, version: "1.2.3" },
      { name: ICONS, version: "4.5.6" },
    ];
    const manifest = {
      releases: packages
        .filter((p) => batch.includes(p.name))
        .map((p) => ({ ...p, tarball: { integrity: "verified" } })),
      compatibilityBaselineSet: packages
        .filter((p) => !batch.includes(p.name))
        .map((p) => ({
          package: p.name,
          version: p.version,
          integrity: "verified",
        })),
    };
    const { tags, filename } = documentationPlan(manifest);
    assert.deepEqual(
      tags,
      packages
        .filter((p) => batch.includes(p.name))
        .map((p) => p.name + "@" + p.version),
    );
    assert.equal(filename, "storybook-ui-1.2.3-icons-4.5.6.zip");
    const zip = Buffer.from("verified archive");
    const sha256 = createHash("sha256").update(zip).digest("hex");
    manifest.offlineStorybook = { filename, sha256 };
    await writeFile(path.join(folder, filename), zip);
    const link =
      "https://github.com/example/project/releases/download/test/" + filename;
    const releases = tags.map((tag, i) => ({
      id: i + 1,
      tag_name: tag,
      assets: [],
      body: "Original notes",
      upload_url: "https://uploads.github.com/upload{?name}",
    }));
    let uploads = 0;
    let edits = 0;
    t.mock.method(globalThis, "fetch", async (input, options = {}) => {
      const url = new URL(input);
      if (url.hostname === "registry.npmjs.org")
        return Response.json({ dist: { integrity: "verified" } });
      if (url.hostname === "uploads.github.com") {
        uploads++;
        assert.equal(options.method, "POST");
        assert.deepEqual(options.body, zip);
        const asset = {
          name: filename,
          state: "uploaded",
          digest: "sha256:" + sha256,
          browser_download_url: link,
        };
        releases[0].assets.push(asset);
        return Response.json(asset);
      }
      if (options.method === "PATCH") {
        edits++;
        assert.ok(url.pathname.endsWith("/releases/2"));
        releases[1].body = JSON.parse(options.body).body;
        return Response.json(releases[1]);
      }
      const release = releases.find((r) =>
        decodeURIComponent(url.pathname).endsWith("/tags/" + r.tag_name),
      );
      assert.ok(release);
      return Response.json(release);
    });
    for (let i = 0; i < 2; i++)
      assert.equal(
        await attachDocumentation(folder, manifest, "example/project"),
        link,
      );
    assert.equal(uploads, 1);
    assert.equal(edits, batch.length - 1);
    if (batch.length === 2)
      assert.ok(releases[1].body.startsWith("Original notes\n\n"));
    releases[0].assets[0].digest = "sha256:unexpected";
    await assert.rejects(
      attachDocumentation(folder, manifest, "example/project"),
      /differs/,
    );
    await writeFile(path.join(folder, filename), "changed");
    await assert.rejects(
      attachDocumentation(folder, manifest, "example/project"),
      /checksum mismatch/,
    );
  });
}
