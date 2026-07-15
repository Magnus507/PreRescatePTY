import crypto from "crypto";

const ENCRYPTION_VERSION = "v2";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const LEGACY_ALGORITHM = "aes-256-cbc";
const GCM_AAD = Buffer.from("prerescatepty:sensitive:v2", "utf8");
const LEGACY_IV_LENGTH = 16;
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;
const KEY_HEX_LENGTH = 64;

type EncryptionVersion = "v2" | "legacy-cbc" | "plaintext" | "unknown";

export type DecryptSensitiveOptions = {
  allowPlaintextLegacy?: boolean;
};

export type DecryptSensitiveResult = {
  plaintext: string;
  version: EncryptionVersion;
  needsMigration: boolean;
};

function getEncryptionKey(): Buffer {
  const configuredKey = process.env.ENCRYPTION_KEY;

  if (!configuredKey) {
    throw new Error("invalid_key");
  }

  if (configuredKey.length === KEY_HEX_LENGTH && /^[0-9a-fA-F]+$/.test(configuredKey)) {
    return Buffer.from(configuredKey, "hex");
  }

  if (Buffer.byteLength(configuredKey, "utf8") === 32) {
    return Buffer.from(configuredKey, "utf8");
  }

  throw new Error("invalid_key");
}

function isLegacyCiphertextFormat(text: string): boolean {
  return /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/.test(text);
}

function isVersionedCiphertext(text: string): boolean {
  return /^v\d+:/i.test(text);
}

function splitVersionedCiphertext(text: string): { iv: string; authTag: string; ciphertext: string } | null {
  if (!text.startsWith(`${ENCRYPTION_VERSION}:gcm:`)) return null;

  const parts = text.split(":");
  if (parts.length !== 5) return null;

  const [, version, iv, authTag, ciphertext] = parts;
  if (version !== "gcm") return null;
  return { iv, authTag, ciphertext };
}

function toBuffer(value: string, encoding: BufferEncoding, label: string): Buffer {
  if (!value) {
    throw new Error(label);
  }

  try {
    return Buffer.from(value, encoding);
  } catch {
    throw new Error(label);
  }
}

function encryptGcm(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  cipher.setAAD(GCM_AAD);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    "gcm",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

function decryptGcm(text: string): string {
  const key = getEncryptionKey();
  const parsed = splitVersionedCiphertext(text);

  if (!parsed) {
    throw new Error("malformed_ciphertext");
  }

  const iv = toBuffer(parsed.iv, "base64url", "malformed_ciphertext");
  const authTag = toBuffer(parsed.authTag, "base64url", "malformed_ciphertext");
  const ciphertext = toBuffer(parsed.ciphertext, "base64url", "malformed_ciphertext");

  if (iv.length !== GCM_IV_LENGTH || authTag.length !== GCM_TAG_LENGTH || ciphertext.length === 0) {
    throw new Error("malformed_ciphertext");
  }

  try {
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAAD(GCM_AAD);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("authentication_failed");
  }
}

function decryptLegacyCbc(text: string): string {
  if (!isLegacyCiphertextFormat(text)) {
    throw new Error("malformed_ciphertext");
  }

  const key = getEncryptionKey();
  const [ivHex, ciphertextHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  if (iv.length !== LEGACY_IV_LENGTH || ciphertext.length === 0) {
    throw new Error("malformed_ciphertext");
  }

  try {
    const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("legacy_decryption_failed");
  }
}

function isPlaintextCandidate(text: string): boolean {
  return !text.startsWith(`${ENCRYPTION_VERSION}:gcm:`) && !isLegacyCiphertextFormat(text) && !isVersionedCiphertext(text);
}

function normalizePlaintext(value: string, allowPlaintextLegacy: boolean): DecryptSensitiveResult {
  if (!allowPlaintextLegacy) {
    throw new Error("plaintext_not_allowed");
  }

  return {
    plaintext: value,
    version: "plaintext",
    needsMigration: false,
  };
}

export function encryptSensitiveValue(text: string): string {
  if (text === "") return "";
  return encryptGcm(text);
}

export function decryptSensitiveValue(
  text: string,
  options: DecryptSensitiveOptions = {}
): DecryptSensitiveResult {
  if (text === "") {
    return {
      plaintext: "",
      version: "plaintext",
      needsMigration: false,
    };
  }

  if (text.startsWith(`${ENCRYPTION_VERSION}:gcm:`)) {
    return {
      plaintext: decryptGcm(text),
      version: "v2",
      needsMigration: false,
    };
  }

  if (isLegacyCiphertextFormat(text)) {
    return {
      plaintext: decryptLegacyCbc(text),
      version: "legacy-cbc",
      needsMigration: true,
    };
  }

  if (isVersionedCiphertext(text)) {
    throw new Error("unsupported_version");
  }

  if (isPlaintextCandidate(text)) {
    return normalizePlaintext(text, options.allowPlaintextLegacy ?? false);
  }

  throw new Error("unsupported_version");
}

export function getEncryptionVersion(text: string): EncryptionVersion {
  if (text === "") return "plaintext";
  if (text.startsWith(`${ENCRYPTION_VERSION}:gcm:`)) return "v2";
  if (isLegacyCiphertextFormat(text)) return "legacy-cbc";
  if (isVersionedCiphertext(text)) return "unknown";
  if (isPlaintextCandidate(text)) return "plaintext";
  return "unknown";
}

export function isLegacyCiphertext(text: string): boolean {
  return getEncryptionVersion(text) === "legacy-cbc";
}

export function encrypt(text: string): string {
  return encryptSensitiveValue(text);
}

export function decrypt(text: string, options?: DecryptSensitiveOptions): string {
  return decryptSensitiveValue(text, options).plaintext;
}

export function isEncrypted(text: string): boolean {
  return getEncryptionVersion(text) !== "plaintext" && getEncryptionVersion(text) !== "unknown";
}
