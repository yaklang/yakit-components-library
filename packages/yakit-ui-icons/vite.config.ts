import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { createSvgReactPlugin } from "../yakit-ui/config/svgReactTransform";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const iconSourceRoot = path.resolve(packageRoot, "../yakit-ui/src/icons");

export default defineConfig({
  build: {
    copyPublicDir: false,
    lib: {
      entry: {
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
  plugins: [react(), createSvgReactPlugin()],
});
