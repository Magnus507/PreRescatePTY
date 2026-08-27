import { createHmac, timingSafeEqual } from "node:crypto";

const YAPPY_ENDPOINTS = {
  production: {
    apiBaseUrl: "https://apipagosbg.bgeneral.cloud",
    buttonScriptUrl: "https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js",
  },
  uat: {
    apiBaseUrl: "https://api-comecom-uat.yappycloud.com",
    buttonScriptUrl: "https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js",
  },
} as const;

export type YappyEnvironment = keyof typeof YAPPY_ENDPOINTS;

export type YappyCheckoutSession = {
  transactionId: string;
  documentName: string;
  token: string;
};

type YappyApiResponse = {
  status?: {
    code?: string | number;
    description?: string;
  };
  body?: Record<string, unknown>;
};

export class YappyConfigurationError extends Error {
  constructor(message = "Yappy no esta configurado") {
    super(message);
    this.name = "YappyConfigurationError";
  }
}

export class YappyProviderError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "YappyProviderError";
    this.code = code;
  }
}

export function getYappyEnvironment(): YappyEnvironment {
  return process.env.YAPPY_ENVIRONMENT === "production" ? "production" : "uat";
}

export function getYappyButtonScriptUrl(environment = getYappyEnvironment()) {
  return YAPPY_ENDPOINTS[environment].buttonScriptUrl;
}

export function getYappyConfig() {
  const merchantId = process.env.YAPPY_MERCHANT_ID?.trim();
  const secretKey = process.env.YAPPY_SECRET_KEY?.trim();
  const configuredDomain = process.env.YAPPY_DOMAIN?.trim();

  if (!merchantId || !secretKey || !configuredDomain) {
    throw new YappyConfigurationError();
  }

  let domain: string;
  try {
    const parsed = new URL(configuredDomain);
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
      throw new Error("invalid_domain");
    }
    domain = parsed.origin;
  } catch {
    throw new YappyConfigurationError("El dominio de Yappy no es valido");
  }

  const environment = getYappyEnvironment();
  return {
    merchantId,
    secretKey,
    domain,
    environment,
    ...YAPPY_ENDPOINTS[environment],
  };
}

export function normalizeYappyAlias(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("507") && digits.length === 11) digits = digits.slice(3);
  return /^\d{8}$/.test(digits) ? digits : null;
}

function extractProviderError(payload: YappyApiResponse, fallback: string) {
  const code = payload.status?.code === undefined ? null : String(payload.status.code);
  const description = payload.status?.description?.trim();
  return new YappyProviderError(description || fallback, code);
}

async function postYappy(url: string, body: Record<string, unknown>, authorization?: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });

  let payload: YappyApiResponse = {};
  try {
    payload = (await response.json()) as YappyApiResponse;
  } catch {
    throw new YappyProviderError("Yappy devolvio una respuesta invalida");
  }

  if (!response.ok) {
    throw extractProviderError(payload, "Yappy no pudo procesar la solicitud");
  }

  return payload;
}

export async function createYappyCheckout(input: {
  providerOrderId: string;
  aliasYappy: string;
  subtotal: string;
  total: string;
}): Promise<YappyCheckoutSession> {
  const config = getYappyConfig();

  const validation = await postYappy(`${config.apiBaseUrl}/payments/validate/merchant`, {
    merchantId: config.merchantId,
    urlDomain: config.domain,
  });
  const authorization = validation.body?.token;
  const paymentDate = validation.body?.epochTime;

  if (typeof authorization !== "string" || !authorization || (typeof paymentDate !== "string" && typeof paymentDate !== "number")) {
    throw extractProviderError(validation, "Yappy no autorizo el comercio");
  }

  const payment = await postYappy(
    `${config.apiBaseUrl}/payments/payment-wc`,
    {
      merchantId: config.merchantId,
      orderId: input.providerOrderId,
      domain: config.domain,
      paymentDate,
      aliasYappy: input.aliasYappy,
      ipnUrl: `${config.domain}/api/payments/yappy/ipn`,
      discount: "0.00",
      taxes: "0.00",
      subtotal: input.subtotal,
      total: input.total,
    },
    authorization
  );

  const transactionId = payment.body?.transactionId;
  const documentName = payment.body?.documentName;
  const token = payment.body?.token;
  if (
    (typeof transactionId !== "string" && typeof transactionId !== "number") ||
    typeof documentName !== "string" ||
    typeof token !== "string"
  ) {
    throw extractProviderError(payment, "Yappy no creo la orden de pago");
  }

  return {
    transactionId: String(transactionId),
    documentName,
    token,
  };
}

function getYappyHmacSecret(secretKey: string) {
  let decoded: string;
  try {
    decoded = Buffer.from(secretKey, "base64").toString("utf8");
  } catch {
    throw new YappyConfigurationError("La clave secreta de Yappy no es valida");
  }
  const secret = decoded.split(".")[0];
  if (!secret) throw new YappyConfigurationError("La clave secreta de Yappy no es valida");
  return secret;
}

export function verifyYappyIpnSignature(input: {
  orderId: string;
  status: string;
  domain: string;
  hash: string;
}) {
  const config = getYappyConfig();
  if (input.domain !== config.domain || !/^[a-fA-F0-9]{64}$/.test(input.hash)) return false;

  const expected = createHmac("sha256", getYappyHmacSecret(config.secretKey))
    .update(`${input.orderId}${input.status}${input.domain}`)
    .digest("hex");
  const suppliedBuffer = Buffer.from(input.hash.toLowerCase(), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}
