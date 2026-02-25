import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface NearbyParty {
  id: string;
  host_id: string;
  mood: string | null;
  description: string | null;
  location_name: string | null;
  expires_at: string | null;
  is_boosted: boolean;
  lat: number;
  lng: number;
}

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(value: string | null): boolean {
  if (value == null || value === "") return false;
  return value === "true" || value === "1";
}

export async function GET(request: Request) {
  try {
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

    const { data, error } = await supabase.rpc("get_nearby_parties" as never, {
      p_lat: lat,
      p_lng: lng,
      p_radius_m: radius_m,
      p_filter_my: my,
      p_user_id: user.id,
    } as never);

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
