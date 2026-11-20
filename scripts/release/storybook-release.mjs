import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const UI = "@yakit-libs/yakit-ui";
export const ICONS = "@yakit-libs/yakit-ui-icons";

export function documentationPlan(manifest) {
  const packages = new Map();
  for (const { name, version, tarball } of manifest.releases)
    packages.set(name, { ...tarball, name, version, released: true });
  for (const baseline of manifest.compatibilityBaselineSet) {
    if (packages.has(baseline.package))
      throw new Error("Duplicate documentation package");
    packages.set(baseline.package, {
      ...baseline,
      name: baseline.package,
      released: false,
    });
  }
  const pair = [packages.get(UI), packages.get(ICONS)];
  if (
    packages.size !== 2 ||
    pair.some(
      (item) => !item || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(item.version),
    )
  )
    throw new Error("Expected an exact UI and icons version pair");
  const tags = pair
    .filter((item) => item.released)
    .map((item) => `${item.name}@${item.version}`);
  if (!tags.length) throw new Error("Empty documentation release");
  const filename = `storybook-ui-${pair[0].version}-icons-${pair[1].version}.zip`;
  return { pair, tags, filename };
}

export async function checkedFile(directory, filename, sha256) {
  if (path.basename(filename) !== filename)
    throw new Error("Invalid artifact filename");
  const file = path.join(directory, filename);
  const bytes = await readFile(file);
  if (createHash("sha256").update(bytes).digest("hex") !== sha256)
    throw new Error(`Artifact checksum mismatch: ${filename}`);
  return file;
}
