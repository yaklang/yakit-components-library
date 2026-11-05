import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkPrivateIcons } from "../../packages/yakit-ui/scripts/check-private-icons.mjs";

test("private UI assets are checked independently and unknown assets fail", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yakit-private-icons-"));
  try {
    for (const folder of ["src/components", "config/icon-sources"])
      await cp(
        new URL(`../../packages/yakit-ui/${folder}`, import.meta.url),
        path.join(root, folder),
        { recursive: true },
      );
    const source = JSON.parse(
      await readFile(
        path.join(root, "config/icon-sources/private.json"),
        "utf8",
      ),
    );
    assert.equal(await checkPrivateIcons(root), source.files.length);
    await writeFile(
      path.join(root, "src/components/unregistered.svg"),
      "<svg/>",
    );
    await assert.rejects(checkPrivateIcons(root), /PRIVATE_SVG_UNREGISTERED/);
    await rm(path.join(root, "src/components/unregistered.svg"));
    await rm(path.join(root, "src", source.files[0]));
    await assert.rejects(checkPrivateIcons(root), /PRIVATE_SVG_MISSING/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("UI forwards existing public icon entries and depends on the icon package", async () => {
  const read = async (file) =>
    readFile(new URL(`../../${file}`, import.meta.url), "utf8");
  const ui = JSON.parse(await read("packages/yakit-ui/package.json"));
  assert.equal(ui.dependencies["@yakit-libs/yakit-ui-icons"], "workspace:^");
  for (const family of ["", "outline", "solid", "colorful"]) {
    const source = await read(
      `packages/yakit-ui/src/icons/${family ? `${family}/` : ""}index.tsx`,
    );
    assert.match(source, /export \* from ['"]@yakit-libs\/yakit-ui-icons/);
    assert.doesNotMatch(source, /\.svg|createIcon/);
  }
  const icons = JSON.parse(await read("packages/yakit-ui-icons/package.json"));
  assert.equal(icons.dependencies["@yakit-libs/yakit-ui"], undefined);
  assert.equal(icons.dependencies.antd, undefined);
});
