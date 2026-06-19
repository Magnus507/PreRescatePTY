/**
 * Chip URL utilities for the admin panel.
 * 
 * The canonical public chip URL is based on the short code.
 * Format: https://www.prerescatepty.com/e/{shortCode}
 * 
 * This same URL is used for:
 * - NFC programming
 * - QR generation
 * - Sticker printing
 * - "Copy link" action
 * - Final client delivery
 * 
 * IMPORTANT SECURITY RULE:
 * The activation code must remain separate from the public QR and NFC URL.
 * Do not encode the activation code into the QR.
 * Do not expose the activation code in the public URL.
 */

const CANONICAL_DOMAIN = "https://www.prerescatepty.com";

/**
 * Returns the permanent public chip URL.
 * Uses the canonical production domain when running in production,
 * otherwise falls back to the current origin for development.
 */
export function getChipPublicUrl(shortCode: string): string {
  if (!shortCode) return "";
  
  if (typeof window !== "undefined") {
    // Use current origin in browser context (safe for dev)
    return `${window.location.origin}/e/${shortCode}`;
  }
  
  // Server-side: use canonical production domain
  return `${CANONICAL_DOMAIN}/e/${shortCode}`;
}

/**
 * Returns the canonical production URL for a chip.
 * Use this when you need the absolute production URL regardless of environment.
 */
export function getChipCanonicalUrl(shortCode: string): string {
  if (!shortCode) return "";
  return `${CANONICAL_DOMAIN}/e/${shortCode}`;
}

/**
 * Returns the NFC URL for a chip.
 * Adds ?source=nfc query parameter for NFC source tracking.
 */
export function getChipNfcUrl(shortCode: string): string {
  return `${getChipPublicUrl(shortCode)}?source=nfc`;
}

/**
 * Validates that a QR data payload does NOT contain an activation code.
 * The QR should only encode the public chip URL.
 */
export function validateQrData(data: string): boolean {
  // Activation codes follow the pattern: XXXX-XXXX-XXXX (12 chars with dashes)
  // or alphanumeric codes of 8-12 chars
  const activationCodePattern = /[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/;
  return !activationCodePattern.test(data);
}