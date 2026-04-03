import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for Nominatim geocoding.
 * Avoids CORS issues from client-side requests.
 *
 * Modes:
 * - Default (no mode param): returns single { lat, lng } for best match
 * - mode=autocomplete: returns array of { label, lat, lng } suggestions (max 5)
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const mode = req.nextUrl.searchParams.get("mode");

  if (!q || !q.trim()) {
    return NextResponse.json(mode === "autocomplete" ? [] : null);
  }

  try {
    const encoded = encodeURIComponent(q.trim());
    const limit = mode === "autocomplete" ? 5 : 1;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&q=${encoded}`,
      {
        headers: {
          "User-Agent": "MemoryPalace/1.0 (thememorypalace.ai)",
        },
        next: { revalidate: 86400 }, // cache results for 24h
      }
    );

    if (!res.ok) {
      console.error("[geocode] Nominatim responded with", res.status);
      return NextResponse.json(mode === "autocomplete" ? [] : null);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(mode === "autocomplete" ? [] : null);
    }

    // Autocomplete mode: return multiple suggestions with "City, Country" labels
    if (mode === "autocomplete") {
      const suggestions = data
        .map((item: any) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (isNaN(lat) || isNaN(lng)) return null;

          const addr = item.address || {};
          // Build a "City, Country" label from address fields
          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.county ||
            addr.state ||
            item.display_name?.split(",")[0] ||
            "";
          const country = addr.country || "";
          const label = country ? `${city}, ${country}` : city;

          return { label, lat, lng };
        })
        .filter(Boolean);

      return NextResponse.json(suggestions);
    }

    // Default mode: single result
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(null);
    }

    return NextResponse.json({ lat, lng });
  } catch (err) {
    console.error("[geocode] Error:", err);
    return NextResponse.json(mode === "autocomplete" ? [] : null);
  }
}
