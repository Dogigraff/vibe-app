"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];
const RADIUS_M = 15000;
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
}

export function VibeMap({ my = false }: VibeMapProps) {
  const [center, setCenter] = useState<[number, number]>(MOSCOW_CENTER);
  const [zoom, setZoom] = useState(12);
  const [parties, setParties] = useState<NearbyParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParty, setSelectedParty] = useState<NearbyParty | null>(null);
  const [geolocDone, setGeolocDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<{ lat: number; lng: number; zoom: number } | null>(
    null
  );

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
  }, [center, my, fetchParties]);

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

  const apiKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY : "";

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
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
