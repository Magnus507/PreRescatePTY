import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-fallback-32-chars-long-key-!!!!"; // Must be 32 chars
const IV_LENGTH = 16; // For AES-256-CBC

/**
 * Encrypts a string using AES-256-CBC.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
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
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
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
