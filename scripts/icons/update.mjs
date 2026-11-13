import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkPrivateIcons } from "../../packages/yakit-ui/scripts/check-private-icons.mjs";
import { readIconSources } from "../../packages/yakit-ui-icons/scripts/icon-source-data.mjs";
import {
  applyChanges,
  parseIconUpdateArgs,
  planIconUpdate,
} from "../../packages/yakit-ui-icons/scripts/update-icons.mjs";
import { planStorybookUpdate } from "./storybook.mjs";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));

export async function runWorkspaceIconUpdate(
  args = process.argv.slice(2),
  root = repositoryRoot,
) {
  const { family, check } = parseIconUpdateArgs(args);
  await checkPrivateIcons(path.join(root, "packages/yakit-ui"));
  const iconRoot = path.join(root, "packages/yakit-ui-icons");
  const sources = readIconSources(
    pathToFileURL(`${iconRoot}/config/icon-sources/`),
  );
  const iconChanges = await planIconUpdate(iconRoot, { family, sources });
  const changes = new Map(
    [...iconChanges].map(([file, change]) => [
      `packages/yakit-ui-icons/${file}`,
      change,
    ]),
  );
  if (!family || family === "colorful") {
    for (const [file, change] of await planStorybookUpdate(
      root,
      sources.colorful,
    ))
      changes.set(file, change);
  }
  if (check && changes.size)
    throw new Error(
      `ICON_GENERATED_DRIFT\n${[...changes.keys()].join("\n")}\nRun pnpm icons:update${family ? ` --family ${family}` : ""}`,
    );
  // Both packages are planned and validated before one atomic write transaction.
  if (!check) await applyChanges(root, changes);
  return `ICONS_${check ? "CHECK_OK" : "UPDATED"} ${changes.size} file(s)${changes.size ? `\n${[...changes.keys()].join("\n")}` : ""}\n`;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.stdout.write(await runWorkspaceIconUpdate());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
