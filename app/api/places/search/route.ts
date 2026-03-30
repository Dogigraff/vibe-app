import { NextResponse } from "next/server";

/**
 * Server-side proxy to Yandex Geocoder HTTP API.
 * Called from CreateVibeModal to search places/addresses.
 * This avoids all CSP / window.ymaps issues in Telegram WebApp.
 *
 * GET /api/places/search?q=ресторан+Теремок+Москва
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
    const url = new URL("https://geocode-maps.yandex.ru/1.x/");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("geocode", query);
    url.searchParams.set("results", "5");
    url.searchParams.set("lang", "ru_RU");

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) {
      console.error("Yandex Geocoder HTTP error:", res.status);
      return NextResponse.json([]);
    }

    const data = await res.json();

    const members =
      data?.response?.GeoObjectCollection?.featureMember ?? [];

    const results = members.map((m: any) => {
      const obj = m.GeoObject;
      // Yandex returns coordinates as "lng lat" string
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
