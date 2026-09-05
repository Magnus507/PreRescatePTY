import { z } from "zod";

export type EnvScope = "build" | "runtime" | "script" | "test" | "platform";

export const ENV_CONTRACT = {
  APP_URL: { scopes: ["script"], example: true, sensitive: false, requiredInProduction: false },
  APPLY_W605G_H5: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  BOOTSTRAP_ADMIN_USER_ID: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_AFTER_SALES_SMOKE: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_CLEAN_OPERATIONS_SMOKE: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_COMMERCIAL_DISPATCH_SMOKE: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_E2E_ACTIVATION_W542B: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_E2E_OPERATIONS_W542A: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_FULL_ERP_SMOKE: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_OPERATIONS_SMOKE: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_REPAIR_INTERNAL_STOCK_W542C: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_REPAIR_ORDER_PAYMENT_PROOF: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_SEED_BASE_FINISHED_GOODS: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_SEED_BASE_MATERIALS: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_STRUCTURAL_SEED: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CONFIRM_W539L_SMOKE: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  CRON_SECRET: { scopes: ["runtime"], example: true, sensitive: true, requiredInProduction: true },
  DATABASE_URL: { scopes: ["runtime", "script", "test"], example: true, sensitive: true, requiredInProduction: true },
  DATABASE_URL_TEST: { scopes: ["test"], example: true, sensitive: true, requiredInProduction: false },
  DIRECT_URL: { scopes: ["build", "script"], example: true, sensitive: true, requiredInProduction: false },
  DRY_RUN: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  ENCRYPTION_KEY: { scopes: ["runtime"], example: true, sensitive: true, requiredInProduction: true },
  NEXTAUTH_SECRET: { scopes: ["runtime"], example: true, sensitive: true, requiredInProduction: true },
  NEXTAUTH_URL: { scopes: ["runtime"], example: true, sensitive: false, requiredInProduction: true },
  NEXT_PUBLIC_APP_URL: { scopes: ["build", "runtime"], example: true, sensitive: false, requiredInProduction: false },
  NEXT_PUBLIC_SENTRY_DSN: { scopes: ["build", "runtime"], example: true, sensitive: false, requiredInProduction: false },
  NEXT_PUBLIC_SITE_URL: { scopes: ["build", "runtime"], example: true, sensitive: false, requiredInProduction: true },
  NEXT_PUBLIC_SUPABASE_URL: { scopes: ["build", "runtime"], example: true, sensitive: false, requiredInProduction: true },
  NEXT_PUBLIC_VERCEL_ENV: { scopes: ["build", "platform"], example: false, sensitive: false, requiredInProduction: false },
  NEXT_RUNTIME: { scopes: ["platform"], example: false, sensitive: false, requiredInProduction: false },
  NODE_ENV: { scopes: ["build", "runtime", "test", "platform"], example: false, sensitive: false, requiredInProduction: false },
  RESEND_API_KEY: { scopes: ["runtime"], example: true, sensitive: true, requiredInProduction: false },
  RESEND_FROM_EMAIL: { scopes: ["runtime"], example: true, sensitive: false, requiredInProduction: false },
  SEED_ADMIN_EMAIL: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  SEED_ADMIN_PASSWORD: { scopes: ["script"], example: false, sensitive: true, requiredInProduction: false },
  SEED_CLIENT_PASSWORD: { scopes: ["script"], example: false, sensitive: true, requiredInProduction: false },
  SEED_CORPORATE_PASSWORD: { scopes: ["script"], example: false, sensitive: true, requiredInProduction: false },
  SEED_SUPERADMIN_PASSWORD: { scopes: ["script"], example: false, sensitive: true, requiredInProduction: false },
  SUPABASE_SERVICE_ROLE_KEY: { scopes: ["runtime"], example: true, sensitive: true, requiredInProduction: true },
  SUPABASE_URL: { scopes: ["script"], example: true, sensitive: false, requiredInProduction: false },
  TWILIO_ACCOUNT_SID: { scopes: ["runtime"], example: true, sensitive: true, requiredInProduction: false },
  TWILIO_AUTH_TOKEN: { scopes: ["runtime"], example: true, sensitive: true, requiredInProduction: false },
  TWILIO_PHONE_NUMBER: { scopes: ["runtime"], example: true, sensitive: false, requiredInProduction: false },
  TWILIO_WHATSAPP_FROM: { scopes: ["runtime"], example: true, sensitive: false, requiredInProduction: false },
  TWILIO_WHATSAPP_NUMBER: { scopes: ["runtime"], example: true, sensitive: false, requiredInProduction: false },
  UPSTASH_REDIS_REST_TOKEN: { scopes: ["runtime"], example: true, sensitive: true, requiredInProduction: true },
  UPSTASH_REDIS_REST_URL: { scopes: ["runtime"], example: true, sensitive: false, requiredInProduction: true },
  VERCEL: { scopes: ["platform"], example: false, sensitive: false, requiredInProduction: false },
  VERCEL_ENV: { scopes: ["runtime", "platform"], example: false, sensitive: false, requiredInProduction: false },
  VERCEL_URL: { scopes: ["runtime", "platform"], example: false, sensitive: false, requiredInProduction: false },
  W537V_SMOKE_CLEANUP: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  W537V_SMOKE_CONFIRM: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  W603C_MAPPING_BACKFILL_DRY_RUN: { scopes: ["script"], example: false, sensitive: false, requiredInProduction: false },
  W603C_MAPPING_BACKFILL_TOKEN: { scopes: ["script"], example: false, sensitive: true, requiredInProduction: false },
  YAPPY_DOMAIN: { scopes: ["runtime"], example: true, sensitive: false, requiredInProduction: false },
  YAPPY_ENVIRONMENT: { scopes: ["runtime"], example: true, sensitive: false, requiredInProduction: false },
  YAPPY_MERCHANT_ID: { scopes: ["runtime"], example: true, sensitive: true, requiredInProduction: false },
  YAPPY_SECRET_KEY: { scopes: ["runtime"], example: true, sensitive: true, requiredInProduction: false },
} as const;

export type ContractEnvKey = keyof typeof ENV_CONTRACT;

const nonEmpty = z.string().trim().min(1);
const httpUrl = z.string().url();
const optionalUrl = z.union([httpUrl, z.literal("")]).optional();
const optionalString = z.string().optional();
const vercelEnvironment = z.enum(["development", "preview", "production"]).optional();

const encryptionKey = z.string().superRefine((value, ctx) => {
  const isHexKey = /^[0-9a-fA-F]{64}$/.test(value);
  const isUtf8Key = new TextEncoder().encode(value).length === 32;
  if (!isHexKey && !isUtf8Key) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "must be 64 hex characters or exactly 32 UTF-8 bytes",
    });
  }
});

const optionalIntegrationShape = {
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_VERCEL_ENV: vercelEnvironment,
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: optionalString,
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_PHONE_NUMBER: optionalString,
  TWILIO_WHATSAPP_FROM: optionalString,
  TWILIO_WHATSAPP_NUMBER: optionalString,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  UPSTASH_REDIS_REST_URL: optionalUrl,
  YAPPY_DOMAIN: optionalUrl,
  YAPPY_ENVIRONMENT: z.enum(["uat", "production"]).optional(),
  YAPPY_MERCHANT_ID: optionalString,
  YAPPY_SECRET_KEY: optionalString,
} as const;

const scriptOnlyShape = {
  APPLY_W605G_H5: optionalString,
  CONFIRM_AFTER_SALES_SMOKE: optionalString,
  CONFIRM_CLEAN_OPERATIONS_SMOKE: optionalString,
  CONFIRM_COMMERCIAL_DISPATCH_SMOKE: optionalString,
  CONFIRM_E2E_ACTIVATION_W542B: optionalString,
  CONFIRM_E2E_OPERATIONS_W542A: optionalString,
  CONFIRM_FULL_ERP_SMOKE: optionalString,
  CONFIRM_OPERATIONS_SMOKE: optionalString,
  CONFIRM_REPAIR_INTERNAL_STOCK_W542C: optionalString,
  CONFIRM_REPAIR_ORDER_PAYMENT_PROOF: optionalString,
  CONFIRM_SEED_BASE_FINISHED_GOODS: optionalString,
  CONFIRM_SEED_BASE_MATERIALS: optionalString,
  CONFIRM_STRUCTURAL_SEED: optionalString,
  CONFIRM_W539L_SMOKE: optionalString,
  DRY_RUN: optionalString,
  SEED_ADMIN_EMAIL: optionalString,
  SEED_ADMIN_PASSWORD: optionalString,
  SEED_CLIENT_PASSWORD: optionalString,
  SEED_CORPORATE_PASSWORD: optionalString,
  SEED_SUPERADMIN_PASSWORD: optionalString,
  W537V_SMOKE_CLEANUP: optionalString,
  W537V_SMOKE_CONFIRM: optionalString,
  W603C_MAPPING_BACKFILL_DRY_RUN: optionalString,
  W603C_MAPPING_BACKFILL_TOKEN: optionalString,
} as const;

export const buildEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_VERCEL_ENV: vercelEnvironment,
});

export const runtimeEnvSchema = z.object({
  DATABASE_URL: optionalString,
  ENCRYPTION_KEY: optionalString,
  NEXTAUTH_SECRET: optionalString,
  NEXTAUTH_URL: optionalUrl,
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  CRON_SECRET: optionalString,
  VERCEL_URL: optionalString,
  ...optionalIntegrationShape,
});

function isPresent(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function requireFieldsWhenEnabled(
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
  triggerFields: string[],
  requiredFields: string[],
  label: string,
) {
  if (!triggerFields.some((key) => isPresent(data[key]))) return;

  for (const key of requiredFields) {
    if (!isPresent(data[key])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${label} is partially configured`,
      });
    }
  }
}

const productionRuntimeBaseSchema = z.object({
  DATABASE_URL: nonEmpty,
  ENCRYPTION_KEY: encryptionKey,
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: httpUrl,
  NEXT_PUBLIC_SITE_URL: httpUrl,
  NEXT_PUBLIC_SUPABASE_URL: httpUrl,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
  CRON_SECRET: z.string().min(16),
  VERCEL_URL: optionalString,
  ...optionalIntegrationShape,
  UPSTASH_REDIS_REST_TOKEN: nonEmpty,
  UPSTASH_REDIS_REST_URL: httpUrl,
});

export const productionRuntimeEnvSchema = productionRuntimeBaseSchema.superRefine((data, ctx) => {
  const record = data as Record<string, unknown>;

  requireFieldsWhenEnabled(
    record,
    ctx,
    ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    "Resend",
  );

  const twilioFields = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "TWILIO_WHATSAPP_FROM",
    "TWILIO_WHATSAPP_NUMBER",
  ];
  if (twilioFields.some((key) => isPresent(record[key]))) {
    for (const key of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"]) {
      if (!isPresent(record[key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Twilio is partially configured",
        });
      }
    }
    if (
      !isPresent(record.TWILIO_PHONE_NUMBER) &&
      !isPresent(record.TWILIO_WHATSAPP_FROM) &&
      !isPresent(record.TWILIO_WHATSAPP_NUMBER)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TWILIO_PHONE_NUMBER"],
        message: "Twilio requires at least one sender number",
      });
    }
  }

  requireFieldsWhenEnabled(
    record,
    ctx,
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    "Upstash Redis",
  );

  requireFieldsWhenEnabled(
    record,
    ctx,
    ["YAPPY_MERCHANT_ID", "YAPPY_SECRET_KEY", "YAPPY_DOMAIN"],
    ["YAPPY_MERCHANT_ID", "YAPPY_SECRET_KEY", "YAPPY_DOMAIN"],
    "Yappy",
  );
});

export const scriptEnvSchema = z.object({
  APP_URL: optionalUrl,
  DATABASE_URL: optionalString,
  DIRECT_URL: optionalString,
  SUPABASE_URL: optionalUrl,
  ...scriptOnlyShape,
});

export const testEnvSchema = z.object({
  DATABASE_URL_TEST: nonEmpty,
});

export type EnvValidationScope =
  | "build"
  | "runtime"
  | "script"
  | "test"
  | "staging"
  | "production";

function invalidEnvironmentError(error: z.ZodError) {
  const keys = Array.from(
    new Set(
      error.issues.map((issue) => String(issue.path[0] ?? "environment")),
    ),
  ).sort();
  return new Error(`Invalid environment configuration: ${keys.join(", ")}`);
}

function parseWithSafeError<T extends z.ZodTypeAny>(schema: T, env: NodeJS.ProcessEnv) {
  const result = schema.safeParse(env);
  if (!result.success) throw invalidEnvironmentError(result.error);
  return result.data;
}

export function validateEnvForScope(scope: EnvValidationScope, env: NodeJS.ProcessEnv = process.env) {
  if (scope === "build") return parseWithSafeError(buildEnvSchema, env);
  if (scope === "script") return parseWithSafeError(scriptEnvSchema, env);
  if (scope === "test") return parseWithSafeError(testEnvSchema, env);
  if (scope === "staging" || scope === "production") {
    return parseWithSafeError(productionRuntimeEnvSchema, env);
  }
  return parseWithSafeError(runtimeEnvSchema, env);
}

export function validateStartupEnv(env: NodeJS.ProcessEnv = process.env) {
  const isProductionDeployment = env.VERCEL_ENV
    ? env.VERCEL_ENV === "production"
    : env.NODE_ENV === "production";

  return validateEnvForScope(
    isProductionDeployment ? "production" : "runtime",
    env,
  );
}
