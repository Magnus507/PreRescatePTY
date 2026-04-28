import crypto from "crypto";

const IV_LENGTH = 16; // For AES-256-CBC

function getEncryptionKey(): Buffer {
  const configuredKey = process.env.ENCRYPTION_KEY;

  if (!configuredKey && process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY is required in production");
  }

  const source = configuredKey || "dev-only-pre-rescue-id-encryption-key";
  return Buffer.byteLength(source) === 32
    ? Buffer.from(source)
    : crypto.createHash("sha256").update(source).digest();
}

/**
 * Encrypts a string using AES-256-CBC.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Format: iv:encrypted_text
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Decrypts a string using AES-256-CBC.
 */
export function decrypt(text: string): string {
  if (!text || !text.includes(":")) return text; // Not encrypted or invalid format
  
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (err) {
    console.error("Decryption failed:", err);
    return text; // Return as-is if decryption fails
  }
}

/**
 * Helper to determine if a string is already encrypted.
 * Basic check to avoid double encryption.
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  const parts = text.split(":");
  return parts.length === 2 && parts[0].length === IV_LENGTH * 2;
}
