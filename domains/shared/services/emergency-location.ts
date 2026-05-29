/**
 * Format an emergency location for WhatsApp/prefilled messages.
 *
 * Input examples:
 *   "8.981087, -79.509818"  (raw lat,lng from geolocation)
 *   "Áurea, Boulevard Isaac Hanono Missri..." (full address if available)
 *   "" or undefined         (no location)
 */
export function formatEmergencyLocation(scanLocation: string): {
  text: string;
  mapsUrl: string | null;
} {
  if (!scanLocation?.trim()) {
    return { text: "", mapsUrl: null };
  }

  // Try to extract lat/lng from "lat, lng" format
  const match = scanLocation.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (match) {
    const lat = match[1];
    const lng = match[2];
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    return {
      text: `Ubicación aproximada. Ver mapa: ${mapsUrl}`,
      mapsUrl,
    };
  }

  // If it's already a readable address, use it directly
  return {
    text: `Ubicación aproximada: ${scanLocation.trim()}`,
    mapsUrl: null,
  };
}