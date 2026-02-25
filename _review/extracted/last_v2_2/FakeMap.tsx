"use client";

import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

const DEG_LAT_PER_300M = 300 / 111320;
const DEG_LNG_PER_300M_55 = 300 / 64000;

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

interface FakeMapProps {
  center: [number, number];
  setCenter: (c: [number, number]) => void;
  parties: NearbyParty[];
  loading: boolean;
  selectedParty: NearbyParty | null;
  setSelectedParty: (p: NearbyParty | null) => void;
}

export function FakeMap({
  center,
  setCenter,
  parties,
  loading,
  selectedParty,
  setSelectedParty,
}: FakeMapProps) {
  const move = (dir: "N" | "S" | "E" | "W") => {
    const [lat, lng] = center;
    switch (dir) {
      case "N":
        setCenter([lat + DEG_LAT_PER_300M, lng]);
        break;
      case "S":
        setCenter([lat - DEG_LAT_PER_300M, lng]);
        break;
      case "E":
        setCenter([lat, lng + DEG_LNG_PER_300M_55]);
        break;
      case "W":
        setCenter([lat, lng - DEG_LNG_PER_300M_55]);
        break;
    }
  };

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-4">
      <div className="rounded border bg-muted/50 p-3 text-sm">
        <p className="font-mono text-xs text-muted-foreground">Center</p>
        <p>
          {center[0].toFixed(6)}, {center[1].toFixed(6)}
        </p>
        <div className="mt-2 flex gap-1">
          {(["N", "S", "E", "W"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => move(d)}
              className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
            >
              {d} 300m
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : parties.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Поблизости нет активных vibe
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {parties.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedParty(selectedParty?.id === p.id ? null : p)}
              className={`rounded border p-3 text-left transition-colors ${
                selectedParty?.id === p.id
                  ? "border-primary bg-primary/10"
                  : "hover:bg-muted/50"
              }`}
            >
              <p className="font-medium">{p.location_name || "Без названия"}</p>
              <p className="text-sm text-muted-foreground">
                {getMoodEmoji(p.mood)} {p.mood || "Vibe"}
              </p>
              {p.description && (
                <p className="mt-1 text-sm">{p.description}</p>
              )}
              {p.expires_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(p.expires_at), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
