import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// antd 6 uses @ant-design/cssinjs transitively. Scan package source and
// published output for direct usage, but do not reject lockfiles or installed
// dependency trees containing antd's implementation dependency.
export const REMOVED_UI_RUNTIMES = ["@ant-design/" + "cssinjs"];

// Published output follows a zero-token policy. Any occurrence can identify a
// bundled import, source-map source, resolution path, or generated dependency
// metadata, so even comments and string literals intentionally fail the gate.
export const REMOVED_UI_RUNTIME_SCAN_POLICY = "zero-token";

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".d.ts",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".map",
  ".mjs",
  ".ts",
  ".tsx",
]);

const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function findRemovedUiRuntimeReferences(contents) {
  return REMOVED_UI_RUNTIMES.filter((runtime) => {
    const escaped = escapePattern(runtime);
    return new RegExp(
      `(?:^|[^A-Za-z0-9_$-])${escaped}(?=$|[^A-Za-z0-9_$-])`,
      "m",
    ).test(contents);
  });
}

const isTextFile = (file) =>
  file.endsWith(".d.ts") ||
  TEXT_EXTENSIONS.has(path.extname(file).toLowerCase());

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile() && isTextFile(absolute)) files.push(absolute);
  }
  return files;
}

export async function scanRemovedUiRuntimesInTrees(roots) {
  const findings = [];
  for (const root of roots) {
    for (const file of await walk(root)) {
      const runtimes = findRemovedUiRuntimeReferences(
        await readFile(file, "utf8"),
      );
      if (runtimes.length > 0) findings.push({ file, runtimes });
    }
  }
  return findings;
}
