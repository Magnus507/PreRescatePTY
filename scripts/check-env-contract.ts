import fs from "node:fs";
import path from "node:path";
import { ENV_CONTRACT, type ContractEnvKey } from "../lib/env";

const ROOT = process.cwd();
const EXAMPLE_PATH = path.join(ROOT, ".env.example");
const DOC_PATH = path.join(ROOT, "docs", "ENVIRONMENT_VARIABLES.md");
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".vercel",
  "coverage",
  "docs",
  "node_modules",
  "public",
]);
const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".prisma",
  ".ts",
  ".tsx",
]);

const ENV_PATTERNS = [
  /process\.env\.([A-Z][A-Z0-9_]*)/g,
  /process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g,
  /\benv\(\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\)/g,
];

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;

    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(absolute));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function discoverEnvironmentKeys() {
  const discovered = new Map<string, Set<string>>();
  for (const file of collectSourceFiles(ROOT)) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(ROOT, file).replaceAll(path.sep, "/");

    for (const pattern of ENV_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        const key = match[1];
        if (!discovered.has(key)) discovered.set(key, new Set());
        discovered.get(key)!.add(relative);
      }
    }
  }
  return discovered;
}

function parseExample() {
  const keys: string[] = [];
  for (const rawLine of fs.readFileSync(EXAMPLE_PATH, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
    if (match) keys.push(match[1]);
  }
  return keys;
}

function fail(messages: string[]) {
  console.error("Environment contract check failed:\n");
  for (const message of messages) console.error(`- ${message}`);
  process.exitCode = 1;
}

const errors: string[] = [];
const contractKeys = new Set(Object.keys(ENV_CONTRACT));
const discovered = discoverEnvironmentKeys();

for (const [key, files] of discovered) {
  if (!contractKeys.has(key)) {
    errors.push(
      `${key} is consumed by code but missing from ENV_CONTRACT (${Array.from(files).sort().join(", ")})`,
    );
  }
}

const exampleKeys = parseExample();
const exampleSet = new Set(exampleKeys);
const duplicateExampleKeys = exampleKeys.filter(
  (key, index) => exampleKeys.indexOf(key) !== index,
);
for (const key of new Set(duplicateExampleKeys)) {
  errors.push(`${key} is declared more than once in .env.example`);
}

for (const key of exampleSet) {
  if (!contractKeys.has(key)) errors.push(`${key} exists in .env.example but not ENV_CONTRACT`);
}

for (const [key, metadata] of Object.entries(ENV_CONTRACT)) {
  if (metadata.example && !exampleSet.has(key)) {
    errors.push(`${key} is required in .env.example by ENV_CONTRACT`);
  }
}

const docs = fs.readFileSync(DOC_PATH, "utf8");
for (const key of contractKeys) {
  if (!docs.includes(`\`${key}\``)) {
    errors.push(`${key} is missing from docs/ENVIRONMENT_VARIABLES.md`);
  }
}

if (errors.length > 0) {
  fail(errors.sort());
} else {
  const consumedKeys = Array.from(discovered.keys()).sort();
  const documentedKeys = Array.from(contractKeys).sort();
  console.log(
    `Environment contract OK: ${documentedKeys.length} declared keys, ${consumedKeys.length} consumed keys, .env.example and documentation aligned.`,
  );
}

// Compile-time guard: contract keys remain addressable as a typed union.
const _typedContractKeys: ContractEnvKey[] = Object.keys(ENV_CONTRACT) as ContractEnvKey[];
void _typedContractKeys;
