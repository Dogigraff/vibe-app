"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { FakeMap } from "@/features/map/FakeMap";
import { JoinVibeButton } from "@/features/parties/JoinVibeButton";
import { ReportButton } from "@/features/security/ReportButton";

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];
const RADIUS_M = 15000;
const IS_DEV_TEST_MODE =
  process.env.NEXT_PUBLIC_DEV_TEST_MODE === "true";
const SHOW_DEV_DEBUG =
  IS_DEV_TEST_MODE && process.env.NODE_ENV !== "production";
const DEBOUNCE_METERS = 300;
const DEG_LAT_TO_M = 111320;
const DEG_LNG_TO_M_55 = 64000;

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

function getMoodEmoji(mood: string | null): string {
  if (!mood) return "✨";
  const m = mood.toLowerCase();
  if (m.includes("party") || m.includes("bar")) return "🍻";
  if (m.includes("chill") || m.includes("coffee")) return "☕";
  if (m.includes("walk") || m.includes("culture")) return "🎭";
  if (m.includes("game")) return "🎮";
  return "✨";
}

function approxDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dlat = (lat2 - lat1) * DEG_LAT_TO_M;
  const dlng = (lng2 - lng1) * DEG_LNG_TO_M_55;
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

interface VibeMapProps {
  my?: boolean;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  refreshKey?: number;
}

export function VibeMap({ my = false, onCenterChange, refreshKey }: VibeMapProps) {
  const [center, setCenter] = useState<[number, number]>(MOSCOW_CENTER);
  const [zoom, setZoom] = useState(12);
  const [parties, setParties] = useState<NearbyParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParty, setSelectedParty] = useState<NearbyParty | null>(null);
  const [geolocDone, setGeolocDone] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<{ lat: number; lng: number; zoom: number } | null>(
    null
  );

  // Get current user id for JoinVibeButton / ReportButton
  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setCurrentUserId(data.user.id);
      });
    });
  }, []);

  const fetchParties = useCallback(
    async (lat: number, lng: number) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius_m: String(RADIUS_M),
      });
      if (my) params.set("my", "true");
      try {
        const res = await fetch(`/api/parties/nearby?${params}`, {
          credentials: "include",
          signal: abortRef.current.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as NearbyParty[];
          setParties(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setParties([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [my]
  );

  useEffect(() => {
    if (!geolocDone && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCenter([lat, lng]);
          setGeolocDone(true);
        },
        () => setGeolocDone(true),
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else if (!geolocDone) {
      setGeolocDone(true);
    }
  }, [geolocDone]);

  useEffect(() => {
    fetchParties(center[0], center[1]);
    lastFetchRef.current = { lat: center[0], lng: center[1], zoom };
  }, [center, my, refreshKey, fetchParties]);

  const centerChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!onCenterChange) return;
    if (centerChangeTimerRef.current) clearTimeout(centerChangeTimerRef.current);
    centerChangeTimerRef.current = setTimeout(() => {
      onCenterChange({ lat: center[0], lng: center[1] });
      centerChangeTimerRef.current = null;
    }, 300);
    return () => {
      if (centerChangeTimerRef.current) clearTimeout(centerChangeTimerRef.current);
    };
  }, [center, onCenterChange]);

  const handleBoundsChange = useCallback(
    (e: { get: (key: string) => number[] | number } | undefined) => {
      if (!e?.get) return;
      const newCenter = e.get("newCenter") as number[] | undefined;
      const newZoom = e.get("newZoom") as number | undefined;
      if (!newCenter || newCenter.length < 2) return;
      const lat = newCenter[0];
      const lng = newCenter[1];
      const last = lastFetchRef.current;
      const distMoved = last
        ? approxDistanceM(last.lat, last.lng, lat, lng)
        : Infinity;
      const zoomChanged = last && newZoom !== undefined && last.zoom !== newZoom;
      if (distMoved > DEBOUNCE_METERS || zoomChanged) {
        setCenter([lat, lng]);
        setZoom(newZoom ?? zoom);
        lastFetchRef.current = { lat, lng, zoom: newZoom ?? zoom };
      }
    },
    [zoom]
  );

  const mapState = { center, zoom };

  const apiKey =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY
      : "";
  const useFakeMap = IS_DEV_TEST_MODE || !apiKey;

  const [devLastJson, setDevLastJson] = useState<string>("{}");
  const fetchDevHealth = useCallback(async () => {
    const res = await fetch("/api/health");
    const data = await res.json();
    setDevLastJson(JSON.stringify(data, null, 2));
  }, []);
  const fetchDevNearby = useCallback(async () => {
    const url = `/api/parties/nearby?lat=${center[0]}&lng=${center[1]}&radius_m=15000`;
    const res = await fetch(url, { credentials: "include" });
    const data = await res.json();
    setDevLastJson(JSON.stringify(data, null, 2));
  }, [center]);

  if (useFakeMap) {
    return (
      <div className="relative flex h-full w-full flex-col gap-2 min-h-[400px]">
        <div className="min-h-0 flex-1 overflow-auto">
          <FakeMap
            center={center}
            setCenter={setCenter}
            parties={parties}
            loading={loading}
            selectedParty={selectedParty}
            setSelectedParty={setSelectedParty}
          />
        </div>
        {SHOW_DEV_DEBUG && (
          <div className="shrink-0 border-t bg-muted/30 p-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Dev Debug
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fetchDevHealth}
                className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
              >
                GET /api/health
              </button>
              <button
                type="button"
                onClick={fetchDevNearby}
                className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
              >
                GET /api/parties/nearby
              </button>
            </div>
            <pre className="mt-2 max-h-32 overflow-auto rounded bg-background p-2 text-xs">
              {devLastJson}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[400px]">
      <YMaps query={{ apikey: apiKey || undefined }}>
        <Map
          defaultState={mapState}
          state={mapState}
          width="100%"
          height="100%"
          className="absolute inset-0"
          onBoundschange={handleBoundsChange}
        >
          {parties.map((p) => (
            <Placemark
              key={p.id}
              geometry={[p.lat, p.lng]}
              properties={{
                iconContent: getMoodEmoji(p.mood),
              }}
              options={{
                preset: "islands#blueStretchyIcon",
              }}
              onClick={() => setSelectedParty(p)}
            />
          ))}
        </Map>
      </YMaps>

      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded bg-background/90 px-3 py-1 text-sm">
          Загрузка…
        </div>
      )}

      {!loading && parties.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="rounded bg-background/90 px-4 py-2 text-sm text-muted-foreground">
            Поблизости нет активных vibe
          </p>
        </div>
      )}

      {selectedParty && (
        <div className="absolute bottom-4 left-4 right-4 rounded-lg border bg-background p-4 shadow-lg">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="font-medium">{selectedParty.location_name || "Без названия"}</p>
              <p className="text-sm text-muted-foreground">
                {getMoodEmoji(selectedParty.mood)} {selectedParty.mood || "Vibe"}
              </p>
              {selectedParty.description && (
                <p className="mt-1 text-sm">{selectedParty.description}</p>
              )}
              {selectedParty.expires_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(selectedParty.expires_at), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedParty(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
          <div className="mt-3 space-y-2">
            <JoinVibeButton
              partyId={selectedParty.id}
              hostId={selectedParty.host_id}
              currentUserId={currentUserId}
            />
            <div className="flex justify-end">
              <ReportButton reportedId={selectedParty.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
