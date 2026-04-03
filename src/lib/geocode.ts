/**
 * Geocode a location name to lat/lng via our server-side proxy.
 * The proxy calls OpenStreetMap Nominatim, avoiding browser CORS issues.
 * Returns null if no results found or request fails.
 */
export async function geocodeLocationName(
  locationName: string
): Promise<{ lat: number; lng: number } | null> {
  if (!locationName.trim()) return null;

  try {
    const encoded = encodeURIComponent(locationName.trim());
    const res = await fetch(`/api/geocode?q=${encoded}`);

    if (!res.ok) {
      console.error("[geocode] API responded with", res.status);
      return null;
    }

    const data = await res.json();
    if (!data || typeof data.lat !== "number") return null;

    return { lat: data.lat, lng: data.lng };
  } catch (err) {
    console.error("[geocode] Error:", err);
    return null;
  }
}

export interface GeocodeSuggestion {
  label: string;
  lat: number;
  lng: number;
}

/**
 * Fetch autocomplete suggestions for a location query.
 * Returns up to 5 results formatted as "City, Country".
 */
export async function geocodeAutocomplete(
  query: string
): Promise<GeocodeSuggestion[]> {
  if (!query.trim() || query.trim().length < 2) return [];

  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(`/api/geocode?q=${encoded}&mode=autocomplete`);

    if (!res.ok) {
      console.error("[geocode] Autocomplete API responded with", res.status);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data as GeocodeSuggestion[];
  } catch (err) {
    console.error("[geocode] Autocomplete error:", err);
    return [];
  }
}
