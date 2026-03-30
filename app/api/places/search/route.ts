import { NextResponse } from "next/server";

/**
 * Server-side proxy to Yandex Geosuggest API.
 * This API returns BOTH addresses AND businesses/organizations.
 * Falls back to Geocoder API if Geosuggest fails.
 *
 * GET /api/places/search?q=бар+стрелка+москва
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Yandex Maps API key not configured" },
      { status: 500 }
    );
  }

  try {
    // 1) Try Geosuggest API first — finds organizations, addresses, places
    const suggestUrl = new URL("https://suggest-maps.yandex.ru/v1/suggest");
    suggestUrl.searchParams.set("apikey", apiKey);
    suggestUrl.searchParams.set("text", query);
    suggestUrl.searchParams.set("lang", "ru");
    suggestUrl.searchParams.set("results", "6");
    // Types: biz (businesses), geo (addresses/places), transit (stops)
    suggestUrl.searchParams.set("types", "biz,geo");
    // Center the search around Moscow for better relevance
    suggestUrl.searchParams.set("print_address", "1");

    const suggestRes = await fetch(suggestUrl.toString());

    if (suggestRes.ok) {
      const suggestData = await suggestRes.json();
      const suggestions = suggestData?.results ?? [];

      if (suggestions.length > 0) {
        const results = await Promise.all(
          suggestions.map(async (item: any) => {
            const title = item.title?.text ?? "";
            const subtitle = item.subtitle?.text ?? "";
            const address = item.address?.formatted_address ?? subtitle;

            // If the suggestion has coordinates, use them directly
            // Otherwise, geocode the full text
            let lat = 0;
            let lng = 0;

            if (item.center) {
              // Geosuggest sometimes returns center coordinates
              lat = item.center[1] ?? 0;
              lng = item.center[0] ?? 0;
            }

            // If no coordinates from suggest, geocode the address
            if (lat === 0 && lng === 0) {
              const geocodeText = address || `${title} ${subtitle}`;
              const coords = await geocodeAddress(apiKey, geocodeText);
              lat = coords.lat;
              lng = coords.lng;
            }

            return {
              name: title,
              description: subtitle || address,
              fullAddress: address || `${title}, ${subtitle}`,
              lat,
              lng,
            };
          })
        );

        // Filter out results with zero coordinates
        const validResults = results.filter((r) => r.lat !== 0 || r.lng !== 0);
        if (validResults.length > 0) {
          return NextResponse.json(validResults);
        }
      }
    }

    // 2) Fallback: plain Geocoder for addresses
    const geocodeUrl = new URL("https://geocode-maps.yandex.ru/1.x/");
    geocodeUrl.searchParams.set("apikey", apiKey);
    geocodeUrl.searchParams.set("format", "json");
    geocodeUrl.searchParams.set("geocode", query);
    geocodeUrl.searchParams.set("results", "5");
    geocodeUrl.searchParams.set("lang", "ru_RU");

    const geocodeRes = await fetch(geocodeUrl.toString());
    if (!geocodeRes.ok) return NextResponse.json([]);

    const geocodeData = await geocodeRes.json();
    const members =
      geocodeData?.response?.GeoObjectCollection?.featureMember ?? [];

    const results = members.map((m: any) => {
      const obj = m.GeoObject;
      const pos = obj.Point?.pos?.split(" ") ?? [];
      const lng = parseFloat(pos[0]) || 0;
      const lat = parseFloat(pos[1]) || 0;

      return {
        name: obj.name ?? "",
        description: obj.description ?? "",
        fullAddress:
          obj.metaDataProperty?.GeocoderMetaData?.text ?? obj.name ?? "",
        lat,
        lng,
      };
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error("Places search error:", err);
    return NextResponse.json([]);
  }
}

/** Helper: geocode a text string to lat/lng via Yandex Geocoder */
async function geocodeAddress(
  apiKey: string,
  text: string
): Promise<{ lat: number; lng: number }> {
  try {
    const url = new URL("https://geocode-maps.yandex.ru/1.x/");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("geocode", text);
    url.searchParams.set("results", "1");
    url.searchParams.set("lang", "ru_RU");

    const res = await fetch(url.toString());
    if (!res.ok) return { lat: 0, lng: 0 };

    const data = await res.json();
    const first =
      data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (!first) return { lat: 0, lng: 0 };

    const pos = first.Point?.pos?.split(" ") ?? [];
    return {
      lat: parseFloat(pos[1]) || 0,
      lng: parseFloat(pos[0]) || 0,
    };
  } catch {
    return { lat: 0, lng: 0 };
  }
}
