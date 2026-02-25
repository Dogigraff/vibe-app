"use client";

import { useState } from "react";
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

  const descLen = description.length;
  const descValid = descLen >= MIN_DESC && descLen <= MAX_DESC;

  const doCreate = async (): Promise<Response> => {
    return fetch("/api/parties/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        mood,
        description: description.trim(),
        location_name: locationName.trim() || undefined,
        lat: center.lat,
        lng: center.lng,
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
          <div>
            <label className="mb-1 block text-sm font-medium">
              Место (опционально)
            </label>
            <Input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Название места"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Координаты (центр карты)
            </label>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>lat: {center.lat.toFixed(5)}</span>
              <span>lng: {center.lng.toFixed(5)}</span>
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
