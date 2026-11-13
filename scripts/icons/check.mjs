import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkspaceIconUpdate } from "./update.mjs";
import { checkIcons } from "../../packages/yakit-ui-icons/scripts/check.mjs";
import { run } from "../../packages/yakit-ui-icons/scripts/process.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
try {
  process.stdout.write(await runWorkspaceIconUpdate(["--check"]));
  await checkIcons({ generatedChecked: true });
  const files = (await readdir(path.join(root, "test/icons")))
    .filter((file) => file.endsWith(".test.mjs"))
    .sort()
    .map((file) => path.join(root, "test/icons", file));
  await run(process.execPath, ["--test", ...files], { cwd: root });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
