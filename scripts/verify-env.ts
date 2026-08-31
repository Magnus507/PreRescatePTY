import { validateEnvForScope, type EnvValidationScope } from "../lib/env";

const scope = process.argv[2] as EnvValidationScope | undefined;
const validScopes: EnvValidationScope[] = [
  "build",
  "runtime",
  "script",
  "test",
  "staging",
  "production",
];

if (!scope || !validScopes.includes(scope)) {
  console.error(`Usage: tsx scripts/verify-env.ts <${validScopes.join("|")}>`);
  process.exit(2);
}

try {
  validateEnvForScope(scope, process.env);
  console.log(`Environment validation OK for scope: ${scope}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Invalid environment configuration";
  console.error(message);
  process.exit(1);
}
