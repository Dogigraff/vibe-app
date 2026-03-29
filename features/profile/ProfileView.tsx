"use client";

import { useState, useCallback } from "react";
import { User, Star, Tag, Shield, ShieldAlert, Pencil, Check, X, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AvatarUpload } from "@/features/profile/AvatarUpload";
import type { Profile } from "@/types/db";

interface ProfileViewProps {
  profile: Profile | null;
  userId: string;
  recentVibes?: { id: string; location_name: string | null; mood: string | null; created_at: string }[];
}

function ReputationBadge({ reputation }: { reputation: number }) {
  if (reputation >= 50) return <Shield className="h-4 w-4 text-green-500" aria-label="Trusted" />;
  if (reputation >= 20) return <Star className="h-4 w-4 text-yellow-500" aria-label="Active" />;
  if (reputation < 5) return <ShieldAlert className="h-4 w-4 text-red-500" aria-label="Low reputation" />;
  return <Star className="h-4 w-4 text-muted-foreground" aria-label="Neutral" />;
}

function getReputationLabel(rep: number): string {
  if (rep >= 50) return "Легенда";
  if (rep >= 30) return "Душа компании";
  if (rep >= 20) return "Активный";
  if (rep >= 10) return "Новичок";
  if (rep >= 5) return "Наблюдатель";
  return "Под вопросом";
}

const SUGGESTED_TAGS = ["Кофе", "Спорт", "Вечеринки", "Настолки", "Кино", "Музыка", "Прогулки", "Еда", "Путешествия", "IT"];

export function ProfileView({ profile, userId, recentVibes = [] }: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile?.bio || "");
  const [tags, setTags] = useState<string[]>(profile?.tags || []);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await (supabase as any)
        .from("profiles")
        .update({ bio, tags })
        .eq("id", userId);

      if (updateError) {
        setError(updateError.message);
        return;
      }
      setEditing(false);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }, [bio, tags, userId]);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <p className="text-center text-muted-foreground">
          Профиль не найден. Попробуйте войти снова.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-md space-y-6 px-4 py-6 sm:px-6"
    >
      {/* Avatar & Username */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative p-1">
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-vibe-accent via-vibe-accent-soft to-vibe-accent opacity-90"
            aria-hidden
          />
          <div className="relative rounded-full p-[3px]">
            <AvatarUpload
              currentUrl={localAvatarUrl}
              username={profile.username || ""}
              disabled={!editing}
              onSuccess={(url) => setLocalAvatarUrl(url)}
            />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {profile.username || "Без имени"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Профиль · репутация и интересы</p>
        </div>
      </div>

      {/* Reputation */}
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-border/80 bg-muted/40 p-4 shadow-sm backdrop-blur-sm">
        <ReputationBadge reputation={profile.reputation} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{profile.reputation} очков</span>
          <span className="text-xs text-muted-foreground">{getReputationLabel(profile.reputation)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-2xl border border-border/60 bg-gradient-to-br from-muted/80 to-secondary/60"
            aria-hidden
          />
        ))}
      </div>

      {/* Bio */}
      <div className="rounded-2xl border border-border/80 bg-card/50 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-muted-foreground">О себе</p>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Редактировать"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Расскажи о себе..."
                className="w-full resize-none rounded-xl border border-border/80 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <p className="text-right text-xs text-muted-foreground">{bio.length}/200</p>

              {/* Tag selector */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Интересы (нажми чтобы выбрать)</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_TAGS.map((tag) => {
                    const isSelected = tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-vibe ease-vibe-out active:scale-[0.98] ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-vibe-accent"
                            : "border border-border/60 bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  {saving ? "Сохраняю..." : "Сохранить"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setBio(profile.bio || "");
                    setTags(profile.tags || []);
                    setError(null);
                  }}
                  disabled={saving}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm"
            >
              {profile.bio || "Пока ничего не написано"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Tags (view mode) */}
      {!editing && tags.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card/50 p-4">
          <div className="mb-2 flex items-center gap-1">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Интересы</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent vibes */}
      {recentVibes.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card/50 p-4">
          <div className="mb-3 flex items-center gap-1">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Последние вайбы</p>
          </div>
          <div className="space-y-2">
            {recentVibes.map((vibe) => (
              <div
                key={vibe.id}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 px-3 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">
                    {vibe.mood?.toLowerCase().includes("party") ? "🍻" :
                     vibe.mood?.toLowerCase().includes("coffee") ? "☕" :
                     vibe.mood?.toLowerCase().includes("sport") ? "⚽" :
                     vibe.mood?.toLowerCase().includes("game") ? "🎲" : "✨"}
                  </span>
                  <span className="text-sm truncate">{vibe.location_name || "Вайб"}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {new Date(vibe.created_at).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification badge */}
      {profile.is_verified && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-500">Верифицирован</span>
        </div>
      )}
    </motion.div>
  );
}
