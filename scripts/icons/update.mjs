import { checkPrivateIcons } from "../../packages/yakit-ui/scripts/check-private-icons.mjs";

// Check UI-owned resources before the public generator can write any files.
await checkPrivateIcons();
process.stdout.write(
  await import("../../packages/yakit-ui-icons/scripts/update-icons.mjs").then(
    ({ runIconUpdate }) => runIconUpdate(process.argv.slice(2)),
  ),
);
