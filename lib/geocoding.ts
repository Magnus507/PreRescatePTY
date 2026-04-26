
/**
 * Reverse Geocoding Utility
 * Converts coordinates into human-readable addresses.
 */
export async function getReverseGeocoding(lat: number, lng: number): Promise<{ address?: string, city?: string, country?: string }> {
  try {
    // We use OpenStreetMap Nominatim (Free, no key required for low traffic)
    // Rate limit: 1 request per second
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PreRescatePTY/1.0 (Emergency Identification Platform)'
      }
    });

    if (!response.ok) return {};

    const data = await response.json();
    
    return {
      address: data?.display_name || undefined,
      city: data?.address?.city || data?.address?.town || data?.address?.village || undefined,
      country: data?.address?.country || undefined
    };
  } catch (error) {
    console.error("[Geocoding] Error fetching address:", error);
    return {};
  }
}
