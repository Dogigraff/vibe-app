import { NextResponse } from "next/server";

/**
 * Server-side proxy to Yandex Search API (API Поиска по организациям).
 * Finds businesses, organizations, and geographical objects.
 * Falls back to Geocoder API if Search API fails.
 *
 * GET /api/places/search?q=бар+стрелка+москва
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  // 1. New API Key specifically for Search/Organizations
  const searchApiKey = process.env.YANDEX_SEARCH_API_KEY;
  // 2. Old API Key for Maps/Geocoder
  const mapApiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  try {
    const results = [];

    // --- 1) Yandex Search API (API Поиска по организациям) ---
    if (searchApiKey) {
      const searchUrl = new URL("https://search-maps.yandex.ru/v1/");
      searchUrl.searchParams.set("apikey", searchApiKey);
      searchUrl.searchParams.set("text", query);
      searchUrl.searchParams.set("lang", "ru_RU");
      // Priority to Russia / Moscow, and type biz
      searchUrl.searchParams.set("type", "biz,geo");
      // Restrict/Prioritize Russia (approximate BBOX of RF)
      searchUrl.searchParams.set("rspn", "0"); // 0 means prioritize, 1 means strict restrict. 0 is safer.
      searchUrl.searchParams.set("ll", "37.615560,55.752220"); // Center on Moscow
      searchUrl.searchParams.set("spn", "30.0,30.0"); // Broad span
      
      const res = await fetch(searchUrl.toString(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const features = data?.features || [];
        
        for (const f of features) {
          const coords = f.geometry?.coordinates; // [lng, lat]
          const props = f.properties?.CompanyMetaData || f.properties?.GeocoderMetaData;
          
          if (coords && coords.length === 2 && props) {
            results.push({
              name: f.properties?.name || props.name || "",
              description: f.properties?.description || (props.address || ""),
              fullAddress: props.address || f.properties?.description || f.properties?.name || "",
              lat: coords[1], // Yandex returns [lng, lat] here
              lng: coords[0]
            });
          }
        }
      } else {
        console.error("Yandex Search API error:", res.status, await res.text());
      }
    }

    // --- 2) Fallback or Augment with Yandex Geocoder API (Геокодер) ---
    // If the Search API didn't find anything, we fall back to finding standard geographical places
    if (results.length === 0 && mapApiKey) {
      const geocodeUrl = new URL("https://geocode-maps.yandex.ru/1.x/");
      geocodeUrl.searchParams.set("apikey", mapApiKey);
      geocodeUrl.searchParams.set("format", "json");
      geocodeUrl.searchParams.set("geocode", query);
      geocodeUrl.searchParams.set("results", "5");
      geocodeUrl.searchParams.set("lang", "ru_RU");
      geocodeUrl.searchParams.set("ll", "37.615560,55.752220");
      geocodeUrl.searchParams.set("spn", "30.0,30.0");

      const geocodeRes = await fetch(geocodeUrl.toString(), { cache: "no-store" });
      if (geocodeRes.ok) {
        const geocodeData = await geocodeRes.json();
        const members = geocodeData?.response?.GeoObjectCollection?.featureMember ?? [];

        for (const m of members) {
          const obj = m.GeoObject;
          const pos = obj.Point?.pos?.split(" ") ?? [];
          const lng = parseFloat(pos[0]) || 0;
          const lat = parseFloat(pos[1]) || 0;

          if (lat !== 0 && lng !== 0) {
            results.push({
              name: obj.name ?? "",
              description: obj.description ?? "",
              fullAddress: obj.metaDataProperty?.GeocoderMetaData?.text ?? obj.name ?? "",
              lat,
              lng,
            });
          }
        }
      }
    }

    // Filter duplicates by name if any
    const uniqueResults = results.filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.lat === v.lat)) === i);
    
    // Only return top 5
    return NextResponse.json(uniqueResults.slice(0, 5));
  } catch (err) {
    console.error("Places search error:", err);
    return NextResponse.json([]);
  }
}
