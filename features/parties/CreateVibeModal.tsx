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

interface CreateVibeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center: { lat: number; lng: number };
  onCreated: () => void;
}

interface YMapsSuggestion {
  value: string;
  displayName: string;
}

export function CreateVibeModal({
  open,
  onOpenChange,
  center,
  onCreated,
}: CreateVibeModalProps) {
  const [mood, setMood] = useState<string>("party");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [expiresInHours, setExpiresInHours] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Yandex geocoding states
  const [suggestions, setSuggestions] = useState<YMapsSuggestion[]>([]);
  const [overrideCenter, setOverrideCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const skipSuggestRef = useRef(false);

  const descLen = description.length;
  const descValid = descLen >= MIN_DESC && descLen <= MAX_DESC;

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      setSuggestions([]);
      setOverrideCenter(null);
      setLocationName("");
      setDescription("");
    }
  }, [open]);

  // Handle autocomplete debouncing & fetching
  useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false;
      return;
    }
    const query = locationName.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const ymaps = (window as any).ymaps;
    if (!ymaps || typeof ymaps.suggest !== "function") return;

    setIsSearching(true);
    const timeout = setTimeout(() => {
      ymaps
        .suggest(query)
        .then((items: any[]) => {
          setSuggestions(
            items.map((i) => ({ value: i.value, displayName: i.displayName }))
          );
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }, 400);

    return () => clearTimeout(timeout);
  }, [locationName]);

  const handleSelectSuggestion = async (suggestion: YMapsSuggestion) => {
    skipSuggestRef.current = true;
    setLocationName(suggestion.value);
    setSuggestions([]);

    const ymaps = (window as any).ymaps;
    if (!ymaps || typeof ymaps.geocode !== "function") return;

    try {
      const res = await ymaps.geocode(suggestion.value);
      const firstObject = res.geoObjects.get(0);
      if (firstObject) {
        const coords = firstObject.geometry.getCoordinates();
        // Yandex coordinates usually [lat, lng]
        setOverrideCenter({ lat: coords[0], lng: coords[1] });
      }
    } catch (e) {
      console.error("Yandex Geocode error", e);
    }
  };

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationName(e.target.value);
    // If user modifies input after picking a location, revert to map center
    if (overrideCenter) setOverrideCenter(null);
  };

  const currentLat = overrideCenter?.lat ?? center.lat;
  const currentLng = overrideCenter?.lng ?? center.lng;

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать vibe</DialogTitle>
          <DialogDescription>
            Добавьте новый vibe на карту по текущим координатам
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
          <div className="relative">
            <label className="mb-1 block text-sm font-medium">
              Место (опционально)
            </label>
            <div className="relative">
              <Input
                value={locationName}
                onChange={handleLocationInputChange}
                placeholder="Адрес или название заведения..."
                className="pr-8"
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                {suggestions.map((s, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleSelectSuggestion(s)}
                    className="cursor-pointer px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {s.displayName}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Координаты {overrideCenter ? "(определены по адресу)" : "(центр карты)"}
            </label>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>lat: {currentLat.toFixed(5)}</span>
              <span>lng: {currentLng.toFixed(5)}</span>
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
