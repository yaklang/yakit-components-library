import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { createSvgReactPlugin } from "../yakit-ui/config/svgReactTransform";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const iconSourceRoot = path.resolve(packageRoot, "../yakit-ui/src/icons");
const iconCss = readFileSync(path.join(packageRoot, "icon.css"), "utf8");

function iconBrowserFacades() {
  const facades = {
    "browser/index.js": ["../icon.css", "../index.js"],
    "browser/colorful/index.js": ["../../icon.css", "../../colorful/index.js"],
    "browser/outline/index.js": ["../../icon.css", "../../outline/index.js"],
    "browser/registry.js": ["../icon.css", "../registry.js"],
    "browser/solid/index.js": ["../../icon.css", "../../solid/index.js"],
  } as const;

  return {
    name: "yakit-icon-browser-facades",
    generateBundle(this: { emitFile: (asset: object) => void }) {
      this.emitFile({ fileName: "icon.css", source: iconCss, type: "asset" });
      for (const [fileName, [cssPath, runtimePath]] of Object.entries(
        facades,
      )) {
        this.emitFile({
          fileName,
          source: `import ${JSON.stringify(cssPath)};\nexport * from ${JSON.stringify(runtimePath)};\n`,
          type: "asset",
        });
      }
    },
  };
}

export default defineConfig({
  build: {
    copyPublicDir: false,
    lib: {
      entry: {
        "colorful/index": path.join(iconSourceRoot, "colorful/index.tsx"),
        index: path.join(iconSourceRoot, "index.tsx"),
        "outline/index": path.join(iconSourceRoot, "outline/index.tsx"),
        registry: path.join(iconSourceRoot, "registry.ts"),
        "solid/index": path.join(iconSourceRoot, "solid/index.tsx"),
      },
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) =>
        id === "@yakit-libs/color" ||
        id.startsWith("@yakit-libs/color/") ||
        id === "react" ||
        id.startsWith("react/"),
    },
  },
  plugins: [react(), createSvgReactPlugin(), iconBrowserFacades()],
});
