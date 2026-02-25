import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { MOCK_PARTIES, DEV_HOST_ID } from "@/fixtures/parties.mock";

type NearbyParty = Database["public"]["Functions"]["get_nearby_parties"]["Returns"][number];

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(value: string | null): boolean {
  if (value == null || value === "") return false;
  return value === "true" || value === "1";
}

function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  try {
    const isDevTestMode = process.env.NEXT_PUBLIC_DEV_TEST_MODE === "true";

    if (isDevTestMode) {
      const { searchParams } = new URL(request.url);
      const lat = parseNumber(searchParams.get("lat"), 55.751244);
      const lng = parseNumber(searchParams.get("lng"), 37.618423);
      const radiusRaw = parseNumber(searchParams.get("radius_m") ?? "", 15000);
      const radius_m = Math.max(500, Math.min(50000, radiusRaw));
      const my = parseBool(searchParams.get("my"));

      const filtered = MOCK_PARTIES.filter((p) => {
        const dist = haversineDistanceM(lat, lng, p.lat, p.lng);
        if (dist > radius_m) return false;
        if (my && p.host_id !== DEV_HOST_ID) return false;
        return true;
      });

      const parties: NearbyParty[] = filtered.map((p) => ({
        id: p.id,
        host_id: p.host_id,
        mood: p.mood ?? "",
        description: p.description ?? "",
        location_name: p.location_name ?? "",
        expires_at: p.expires_at ?? "",
        is_boosted: p.is_boosted,
        lat: p.lat,
        lng: p.lng,
      }));
      return NextResponse.json(parties);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = parseNumber(searchParams.get("lat"), 0);
    const lng = parseNumber(searchParams.get("lng"), 0);
    const radiusRaw = parseNumber(searchParams.get("radius_m") ?? "", 15000);
    const radius_m = Math.max(500, Math.min(50000, radiusRaw));
    const my = parseBool(searchParams.get("my"));

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Invalid lat or lng" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .schema("public")
      .rpc("get_nearby_parties", {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: radius_m,
        p_filter_my: my,
        p_user_id: user.id,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const parties: NearbyParty[] = Array.isArray(data) ? data : [];
    return NextResponse.json(parties);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
