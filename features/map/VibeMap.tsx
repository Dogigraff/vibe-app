"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { FakeMap } from "@/features/map/FakeMap";
import { JoinVibeButton } from "@/features/parties/JoinVibeButton";
import { ReportButton } from "@/features/security/ReportButton";
import { CountdownTimer } from "@/components/countdown-timer";
import { PartyChat } from "@/features/chat/PartyChat";
import { motion, AnimatePresence } from "framer-motion";

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];
const RADIUS_M = 15000;
const SHOW_DEV_DEBUG =
  process.env.NEXT_PUBLIC_IS_PRODUCTION !== "true" &&
  process.env.NEXT_PUBLIC_DEV_TEST_MODE === "true";
const DEBOUNCE_METERS = 300;
const DEG_LAT_TO_M = 111320;
const DEG_LNG_TO_M_55 = 64000;

// --- Mood filter config ---
interface MoodFilter {
  key: string;
  label: string;
  emoji: string;
  color: string; // Tailwind bg class for active state
  iconColor: string; // hex for map marker
}

const MOOD_FILTERS: MoodFilter[] = [
  { key: "all", label: "Все", emoji: "✨", color: "bg-violet-500", iconColor: "#8B5CF6" },
  { key: "party", label: "Вечеринка", emoji: "🍻", color: "bg-amber-500", iconColor: "#F59E0B" },
  { key: "coffee", label: "Кофе", emoji: "☕", color: "bg-orange-500", iconColor: "#F97316" },
  { key: "sport", label: "Спорт", emoji: "⚽", color: "bg-green-500", iconColor: "#22C55E" },
  { key: "game", label: "Игры", emoji: "🎲", color: "bg-blue-500", iconColor: "#3B82F6" },
  { key: "culture", label: "Культура", emoji: "🎭", color: "bg-pink-500", iconColor: "#EC4899" },
];

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

function getMoodKey(mood: string | null): string {
  if (!mood) return "all";
  const m = mood.toLowerCase();
  if (m.includes("party") || m.includes("bar") || m.includes("вечеринка")) return "party";
  if (m.includes("chill") || m.includes("coffee") || m.includes("кофе")) return "coffee";
  if (m.includes("sport") || m.includes("спорт")) return "sport";
  if (m.includes("game") || m.includes("игр")) return "game";
  if (m.includes("walk") || m.includes("culture") || m.includes("музей") || m.includes("культур")) return "culture";
  return "all";
}

function getMoodEmoji(mood: string | null): string {
  const key = getMoodKey(mood);
  return MOOD_FILTERS.find((f) => f.key === key)?.emoji || "✨";
}

function getMoodColor(mood: string | null): string {
  const key = getMoodKey(mood);
  return MOOD_FILTERS.find((f) => f.key === key)?.iconColor || "#8B5CF6";
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

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(1)} км`;
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
  const [activeMoodFilter, setActiveMoodFilter] = useState("all");
  const [showChat, setShowChat] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  // Get current user id
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

  // Filter parties by mood on client side
  const filteredParties =
    activeMoodFilter === "all"
      ? parties
      : parties.filter((p) => getMoodKey(p.mood) === activeMoodFilter);

  const mapState = { center, zoom };

  const apiKey =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY
      : "";
  const useFakeMap =
    process.env.NEXT_PUBLIC_DEV_TEST_MODE === "true" || !apiKey;

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

  // --- Mood filter bar ---
  const FilterBar = (
    <div className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-hide">
      {MOOD_FILTERS.map((filter) => {
        const isActive = activeMoodFilter === filter.key;
        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => setActiveMoodFilter(filter.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              isActive
                ? `${filter.color} text-white shadow-md`
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <span>{filter.emoji}</span>
            <span>{filter.label}</span>
          </button>
        );
      })}
    </div>
  );

  // --- Vibe card (updated with countdown, distance, chat) ---
  const VibeCard = selectedParty && (
    <AnimatePresence>
      <motion.div
        key={selectedParty.id}
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute bottom-4 left-4 right-4 rounded-2xl border bg-background/95 backdrop-blur-md shadow-xl overflow-hidden"
      >
        {/* Card header */}
        <div className="p-4">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getMoodEmoji(selectedParty.mood)}</span>
                <p className="font-semibold text-base truncate">
                  {selectedParty.location_name || "Без названия"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {selectedParty.mood && (
                  <span
                    className="rounded-full px-2 py-0.5 text-white text-[10px] font-medium"
                    style={{ backgroundColor: getMoodColor(selectedParty.mood) }}
                  >
                    {selectedParty.mood}
                  </span>
                )}
                <span>
                  📍 {formatDistance(
                    approxDistanceM(
                      center[0], center[1],
                      selectedParty.lat, selectedParty.lng
                    )
                  )}
                </span>
                {selectedParty.expires_at && (
                  <CountdownTimer expiresAt={selectedParty.expires_at} compact />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedParty(null);
                setShowChat(false);
              }}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          {selectedParty.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {selectedParty.description}
            </p>
          )}

          {/* Full countdown timer */}
          {selectedParty.expires_at && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Осталось:</span>
              <CountdownTimer expiresAt={selectedParty.expires_at} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t px-4 py-3 space-y-2">
          <JoinVibeButton
            partyId={selectedParty.id}
            hostId={selectedParty.host_id}
            currentUserId={currentUserId}
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowChat(!showChat)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {showChat ? "Скрыть чат" : "💬 Открыть чат"}
            </button>
            <ReportButton reportedId={selectedParty.id} />
          </div>
        </div>

        {/* Inline chat */}
        {showChat && currentUserId && (
          <div className="border-t h-72">
            <PartyChat partyId={selectedParty.id} currentUserId={currentUserId} />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  if (useFakeMap) {
    return (
      <div className="relative flex h-full w-full flex-col gap-0 min-h-[400px]">
        {FilterBar}
        <div className="min-h-0 flex-1 overflow-auto relative">
          <FakeMap
            center={center}
            setCenter={setCenter}
            parties={filteredParties}
            loading={loading}
            selectedParty={selectedParty}
            setSelectedParty={setSelectedParty}
          />
          {VibeCard}
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
    <div className="relative h-full w-full min-h-[400px] flex flex-col">
      {FilterBar}
      <div className="min-h-0 flex-1 relative">
        <YMaps query={{ apikey: apiKey || undefined }}>
          <Map
            defaultState={mapState}
            state={mapState}
            width="100%"
            height="100%"
            className="absolute inset-0"
            onBoundschange={handleBoundsChange}
          >
            {filteredParties.map((p) => (
              <Placemark
                key={p.id}
                geometry={[p.lat, p.lng]}
                properties={{
                  iconContent: getMoodEmoji(p.mood),
                }}
                options={{
                  preset: "islands#blueStretchyIcon",
                  iconColor: getMoodColor(p.mood),
                }}
                onClick={() => {
                  setSelectedParty(p);
                  setShowChat(false);
                }}
              />
            ))}
          </Map>
        </YMaps>

        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-4 py-2 text-sm shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Загрузка…</span>
            </div>
          </div>
        )}

        {!loading && filteredParties.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="rounded-xl bg-background/90 px-5 py-3 text-sm text-muted-foreground shadow-md backdrop-blur-sm">
              {activeMoodFilter !== "all"
                ? `Нет вайбов с фильтром «${MOOD_FILTERS.find(f => f.key === activeMoodFilter)?.label}» поблизости`
                : "Поблизости нет активных вайбов"}
            </p>
          </div>
        )}

        {VibeCard}
      </div>
    </div>
  );
}
