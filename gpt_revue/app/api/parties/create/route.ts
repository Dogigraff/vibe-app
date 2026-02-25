import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MOODS = ["party", "chill", "walk", "games"] as const;
const EXPIRES_HOURS = [1, 2, 3, 6] as const;

type Mood = (typeof MOODS)[number];
type ExpiresHours = (typeof EXPIRES_HOURS)[number];

interface CreateBody {
  mood: string;
  description: string;
  location_name?: string;
  lat: number;
  lng: number;
  expires_in_hours: number;
}

function validate(body: unknown): { ok: true; data: CreateBody } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid body" };
  }
  const b = body as Record<string, unknown>;
  const mood = b.mood;
  const description = b.description;
  const lat = b.lat;
  const lng = b.lng;
  const expires_in_hours = b.expires_in_hours;

  if (typeof mood !== "string" || !MOODS.includes(mood as Mood)) {
    return { ok: false, error: "mood must be one of: party, chill, walk, games" };
  }
  if (typeof description !== "string") {
    return { ok: false, error: "description required" };
  }
  if (description.length < 5 || description.length > 280) {
    return { ok: false, error: "description must be 5-280 characters" };
  }
  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    return { ok: false, error: "lat must be in [-90, 90]" };
  }
  if (typeof lng !== "number" || lng < -180 || lng > 180) {
    return { ok: false, error: "lng must be in [-180, 180]" };
  }
  if (
    typeof expires_in_hours !== "number" ||
    !EXPIRES_HOURS.includes(expires_in_hours as ExpiresHours)
  ) {
    return { ok: false, error: "expires_in_hours must be 1, 2, 3, or 6" };
  }

  const location_name =
    typeof b.location_name === "string" ? b.location_name : "";

  return {
    ok: true,
    data: {
      mood: mood as Mood,
      description,
      location_name,
      lat,
      lng,
      expires_in_hours: expires_in_hours as ExpiresHours,
    },
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const validated = validate(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: 400 }
      );
    }
    const { mood, description, location_name, lat, lng, expires_in_hours } =
      validated.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.schema("public") as any).rpc("create_party", {
      p_lat: lat,
      p_lng: lng,
      p_mood: mood,
      p_description: description,
      p_location_name: location_name,
      p_expires_in_hours: expires_in_hours,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!row) {
      return NextResponse.json(
        { error: "Failed to create party" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: row.id,
      host_id: row.host_id,
      mood: row.mood,
      description: row.description,
      location_name: row.location_name ?? "",
      status: row.status,
      expires_at: row.expires_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
