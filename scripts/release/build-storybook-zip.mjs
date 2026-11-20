import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  checkedFile,
  documentationPlan,
  UI,
  ICONS,
} from "./storybook-release.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const docs = path.join(root, "storybook");
const directory = path.resolve(process.argv[2] ?? ".release/verified");
const manifestPath = path.join(directory, "verification-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const { pair, filename } = documentationPlan(manifest);
const stage = await mkdtemp(path.join(tmpdir(), "yakit-documentation-"));
const app = path.join(stage, "storybook");
const bundle = path.join(stage, "offline");
const themes = "packages/yakit-ui-icons/config/brand-themes.json";
const env = { ...process.env, STORYBOOK_DISABLE_TELEMETRY: "1" };
for (const key of Object.keys(env))
  if (/token|auth|NODE_PATH/i.test(key)) delete env[key];

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

async function copyStories(item) {
  const family = item.name === UI ? "ui" : "icons";
  const folder = `storybook/stories/${family}`;
  const dest = path.join(stage, folder);
  if (item.released) {
    await cp(path.join(root, folder), dest, { recursive: true });
    return;
  }
  const tag = `refs/tags/${item.name}@${item.version}`;
  const files = git(["ls-tree", "-r", "--name-only", tag, folder]).trim();
  await mkdir(dest, { recursive: true });
  if (files) {
    for (const file of files.split("\n")) {
      const target = path.join(stage, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, git(["show", `${tag}:${file}`]));
    }
    return;
  }
  // Before the split, 0.2.3 publicly exported these three component families.
  // Its old Tag story imported a private component unavailable to package users.
  const legacy = "packages/yakit-ui/.storybook/stories";
  if (family === "ui" && item.version === "0.2.3") {
    for (const name of ["Button", "Input", "InputNumber"]) {
      const file = `${name}.stories.tsx`;
      const source = git(["show", `${tag}:${legacy}/${file}`])
        .replace(
          /import (\w+) from '\.\.\/\.\.\/src\/components\/\w+';/g,
          "import { $1 } from '@yakit-libs/yakit-ui';",
        )
        .replace(
          /from '\.\.\/\.\.\/src\/components\/[^']+'/g,
          "from '@yakit-libs/yakit-ui'",
        );
      await writeFile(path.join(dest, file), source);
    }
    return;
  }
  if (family === "icons") {
    for (const file of ["Icon.stories.tsx", "icon-colorful.generated.ts"])
      await writeFile(
        path.join(dest, file),
        git(["show", `${tag}:${legacy}/${file}`]),
      );
    // This gallery enumerates the installed package's public oldicon entry.
    await cp(
      path.join(docs, "stories/icons/OldIcon.stories.tsx"),
      path.join(dest, "OldIcon.stories.tsx"),
    );
    return;
  }
  throw new Error(`No compatible component stories found for ${tag}`);
}

try {
  await mkdir(app);
  await mkdir(bundle);
  await cp(path.join(docs, "tsconfig.json"), path.join(app, "tsconfig.json"));
  const tarballs = await Promise.all(
    pair.map((item) => checkedFile(directory, item.filename, item.sha256)),
  );
  const toolManifest = JSON.parse(
    await readFile(path.join(docs, "package.json"), "utf8"),
  );
  await writeFile(
    path.join(app, "package.json"),
    JSON.stringify({
      name: "offline-storybook",
      private: true,
      type: "module",
    }),
  );
  await writeFile(path.join(stage, "empty.npmrc"), "");
  execFileSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-package-lock",
      "--prefer-offline",
      "--registry=https://registry.npmjs.org/",
      "--userconfig",
      path.join(stage, "empty.npmrc"),
      ...tarballs,
      "react@18.3.1",
      "react-dom@18.3.1",
      "@yakit-libs/color@1.4.1",
    ],
    { cwd: app, env, stdio: "inherit" },
  );
  const modules = path.join(app, "node_modules");
  // Only tooling is linked from the frozen workspace install. Runtime packages
  // and their dependencies resolve inside the temporary consumer.
  for (const dependency of Object.keys(toolManifest.devDependencies)) {
    const target = path.join(modules, dependency);
    if (await realpath(target).catch(() => null)) continue;
    await mkdir(path.dirname(target), { recursive: true });
    await symlink(
      await realpath(path.join(docs, "node_modules", dependency)),
      target,
      "dir",
    );
  }
  for (const item of pair) {
    const installed = JSON.parse(
      await readFile(path.join(modules, item.name, "package.json"), "utf8"),
    );
    if (installed.version !== item.version)
      throw new Error(`Incorrect installed ${item.name}`);
    if (item.name === UI && installed.dependencies?.[ICONS]) {
      const fromUi = createRequire(path.join(modules, UI, "package.json"));
      const fromDocs = createRequire(path.join(app, "package.json"));
      if (
        (await realpath(fromUi.resolve(ICONS + "/icon.css"))) !==
        (await realpath(fromDocs.resolve(ICONS + "/icon.css")))
      )
        throw new Error("UI and the gallery resolved different icon packages");
    }
    await copyStories(item);
  }
  await cp(path.join(docs, ".storybook"), path.join(app, ".storybook"), {
    recursive: true,
  });
  await mkdir(path.dirname(path.join(stage, themes)), { recursive: true });
  const icons = pair.find((item) => item.name === ICONS);
  const iconsTag = `refs/tags/${ICONS}@${icons.version}`;
  if (icons.released)
    await cp(path.join(root, themes), path.join(stage, themes));
  else if (git(["ls-tree", "--name-only", iconsTag, themes]).trim())
    await writeFile(
      path.join(stage, themes),
      git(["show", `${iconsTag}:${themes}`]),
    );
  else
    await writeFile(
      path.join(app, ".storybook/brand-themes.ts"),
      git(["show", `${iconsTag}:packages/yakit-ui/.storybook/brand-themes.ts`]),
    );
  execFileSync(
    process.execPath,
    [
      path.join(modules, "storybook/bin/index.cjs"),
      "build",
      "--disable-telemetry",
      "-o",
      path.join(bundle, "storybook-static"),
    ],
    { cwd: app, env, stdio: "inherit" },
  );
  await cp(path.join(docs, "serve.mjs"), path.join(bundle, "serve.mjs"));
  await writeFile(
    path.join(bundle, "README.txt"),
    `Yakit Storybook\n${pair.map((item) => item.name + "@" + item.version).join("\n")}\n\n安装 Node.js 后，在解压目录运行 node serve.mjs --open\n默认地址 http://127.0.0.1:6006/\n`,
  );
  // zip is part of the Ubuntu release runner. Consumers need only Node.
  const archive = path.join(stage, filename);
  execFileSync(
    "zip",
    ["-qr", archive, "storybook-static", "serve.mjs", "README.txt"],
    { cwd: bundle },
  );
  await cp(archive, path.join(directory, filename));
  manifest.offlineStorybook = {
    filename,
    sha256: createHash("sha256")
      .update(await readFile(archive))
      .digest("hex"),
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(filename);
} finally {
  await rm(stage, { recursive: true, force: true });
}
