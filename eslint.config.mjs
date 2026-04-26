import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __cwd = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __cwd,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/*", "out/*", "build/*", "next-env.d.ts", "_OLD_LEGACY_SRC/*"],
  },
];

export default config;
