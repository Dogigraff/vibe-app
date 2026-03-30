"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Search, Loader2, X } from "lucide-react";

const MOODS = [
  { value: "party", label: "🍻 Вечеринка" },
  { value: "chill", label: "☕ Чилл" },
  { value: "walk", label: "🎭 Прогулка" },
  { value: "games", label: "🎮 Игры" },
] as const;

const EXPIRES_OPTIONS = [
  { value: 1, label: "1 ч" },
  { value: 2, label: "2 ч" },
  { value: 3, label: "3 ч" },
  { value: 6, label: "6 ч" },
] as const;

const MAX_DESC = 280;
const MIN_DESC = 5;
const IS_DEV =
  process.env.NEXT_PUBLIC_DEV_TEST_MODE === "true" &&
  process.env.NEXT_PUBLIC_DEV_TG_MOCK === "true";

interface PlaceResult {
  name: string;
  description: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

interface CreateVibeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center: { lat: number; lng: number };
  onCreated: () => void;
}

export function CreateVibeModal({
  open,
  onOpenChange,
  center,
  onCreated,
}: CreateVibeModalProps) {
  const [mood, setMood] = useState<string>("party");
  const [description, setDescription] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationName, setLocationName] = useState("");
  const [expiresInHours, setExpiresInHours] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server-side geocoding states
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const descLen = description.length;
  const descValid = descLen >= MIN_DESC && descLen <= MAX_DESC;

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      setSearchResults([]);
      setSelectedPlace(null);
      setLocationQuery("");
      setLocationName("");
      setDescription("");
      setShowResults(false);
      setError(null);
    }
  }, [open]);

  // Debounced search via server API
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = locationQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      // Abort previous request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(query)}`,
          { signal: abortRef.current.signal }
        );
        if (res.ok) {
          const data = (await res.json()) as PlaceResult[];
          setSearchResults(data);
          setShowResults(data.length > 0);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [locationQuery]);

  const handleSelectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    setLocationName(place.name || place.fullAddress);
    setLocationQuery(place.name || place.fullAddress);
    setSearchResults([]);
    setShowResults(false);
  };

  const handleClearPlace = () => {
    setSelectedPlace(null);
    setLocationName("");
    setLocationQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const currentLat = selectedPlace?.lat ?? center.lat;
  const currentLng = selectedPlace?.lng ?? center.lng;

  const doCreate = async (): Promise<Response> => {
    return fetch("/api/parties/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        mood,
        description: description.trim(),
        location_name: locationName.trim() || undefined,
        lat: currentLat,
        lng: currentLng,
        expires_in_hours: expiresInHours,
      }),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!descValid) return;
    setLoading(true);
    try {
      let res = await doCreate();
      if (res.status === 401 && IS_DEV) {
        await fetch("/api/auth/dev-mock", {
          method: "POST",
          credentials: "include",
        });
        res = await doCreate();
      }
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Ошибка создания");
        return;
      }
      onOpenChange(false);
      setDescription("");
      setLocationName("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать vibe</DialogTitle>
          <DialogDescription>
            Добавьте новый vibe на карту
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Настроение</label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              aria-label="Настроение"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {MOODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Описание{" "}
              <span
                className={
                  descValid ? "text-muted-foreground" : "text-destructive"
                }
              >
                ({descLen}/{MAX_DESC})
              </span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите vibe..."
              rows={3}
              maxLength={MAX_DESC}
              className="resize-none"
            />
            {descLen > 0 && descLen < MIN_DESC && (
              <p className="mt-1 text-xs text-destructive">
                Минимум {MIN_DESC} символов
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Время жизни
            </label>
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(Number(e.target.value))}
              aria-label="Время жизни"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {EXPIRES_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* ===== LOCATION SEARCH ===== */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium">
              <Search className="mb-0.5 mr-1.5 inline h-3.5 w-3.5" />
              Место
            </label>

            {/* Selected place pill */}
            {selectedPlace ? (
              <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {selectedPlace.name}
                  </p>
                  {selectedPlace.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {selectedPlace.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearPlace}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Убрать место"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Input
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      if (selectedPlace) setSelectedPlace(null);
                    }}
                    placeholder="Поиск: ресторан, бар, парк, адрес..."
                    className="pr-10"
                    autoComplete="off"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Dropdown results */}
                {showResults && searchResults.length > 0 && (
                  <ul className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-auto rounded-xl border border-border bg-popover shadow-lg">
                    {searchResults.map((place, idx) => (
                      <li
                        key={idx}
                        onClick={() => handleSelectPlace(place)}
                        className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-accent/60"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {place.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {place.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {!selectedPlace && locationQuery.length > 0 && locationQuery.length < 3 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Введите минимум 3 символа для поиска
              </p>
            )}
          </div>

          {/* Coordinates display */}
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {selectedPlace ? (
                <span className="font-medium text-primary">
                  📍 Координаты определены по адресу
                </span>
              ) : (
                <span>📍 Координаты по центру карты</span>
              )}
            </div>
            <div className="mt-1 flex gap-3 font-mono text-xs text-muted-foreground">
              <span>{currentLat.toFixed(5)}</span>
              <span>{currentLng.toFixed(5)}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading || !descValid} className="w-full">
            {loading ? "Создание…" : "Создать vibe"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
